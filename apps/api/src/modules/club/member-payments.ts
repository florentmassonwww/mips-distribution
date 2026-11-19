// Payments on member accounts: cash at the club desk, online payment link, and the state machine
// shared with bank transfers (pending → confirmed | failed | to_verify).
import { z } from "zod";
import { type Actor, SYSTEM_ACTOR } from "../../core/actor.ts";
import { recordAudit } from "../../core/audit.ts";
import { type Db, type Row, all, get, run, transaction } from "../../core/db.ts";
import { ApiError } from "../../core/errors.ts";
import { formatMinor } from "../../core/format.ts";
import { newId } from "../../core/ids.ts";
import { businessDay, iso } from "../../core/time.ts";
import { paymentJournalLines } from "./accounting.ts";
import { memberAccount, reallocatePayments } from "./allocation.ts";
import { autoResolveExceptions as resolveExceptions, queueErpEntry, raiseException as openException } from "../distribution/exceptions.ts";
import { readCompanySettings as loadSettings } from "../distribution/settings.ts";
import {
  actorCompanyId,
  memberById,
  memberPaymentById,
  requireMember,
  requireMemberPayment,
} from "./shared.ts";
import type { ClubConnectors, MemberPaymentRow, MemberRow, ProviderNotification } from "./types.ts";

const idempotencyKey = z.string().min(16).max(80);

export const cashPaymentInput = z.object({
  amountMinor: z.number().int().positive().max(1e8),
  note: z.string().max(200).default(""),
  idempotencyKey,
});

export const linkPaymentInput = z.object({ idempotencyKey });

const IDEMPOTENCY_CONFLICT = "Cette clé d'idempotence a déjà servi pour une autre demande.";

/** Bumps `updated_at` of a member payment. */
export const touchMemberPayment = (db: Db, paymentId: string, now: Date): void => {
  run(db, "UPDATE member_payments SET updated_at = ? WHERE id = ?", iso(now), paymentId);
};

/**
 * Confirms a payment: reallocates the member's account, queues the ERP entry and resolves the
 * verification exceptions. Returns false if it was already confirmed (notifications are replayed).
 */
export function confirmMemberPayment(
  db: Db,
  payment: MemberPaymentRow,
  via: string,
  actor: Actor,
  now: Date,
): boolean {
  if (payment.status === "confirmed") return false;
  run(
    db,
    "UPDATE member_payments SET status = 'confirmed', confirmed_at = ?, confirmed_via = ?, failure_reason = NULL, verify_reason = NULL WHERE id = ?",
    iso(now),
    via,
    payment.id,
  );
  touchMemberPayment(db, payment.id, now);
  reallocatePayments(db, payment.member_id);
  const member = memberById(db, payment.member_id);
  const confirmed = memberPaymentById(db, payment.id);
  queueErpEntry(
    db,
    payment.company_id,
    "member_payment",
    payment.id,
    `Encaissement ${member.number} (${payment.method})`,
    payment.amount_minor,
    {
      member: member.number,
      method: payment.method,
      reference: payment.reference,
      providerRef: payment.provider_ref,
      confirmedVia: via,
      lines: paymentJournalLines(loadSettings(db, payment.company_id).club, confirmed, member),
    },
    now,
  );
  resolveExceptions(db, payment.company_id, ["payment_to_verify", "amount_mismatch"], payment.id, `Confirmé (${via}).`, now);
  recordAudit(
    db,
    actor,
    "member_payment.confirmed",
    "member_payment",
    payment.id,
    { member: member.number, method: payment.method, amountMinor: payment.amount_minor, via },
    payment.company_id,
    now,
  );
  return true;
}

/** Marks a pending (or to-verify) payment as failed. Returns false when it is in another state. */
export function failMemberPayment(db: Db, payment: MemberPaymentRow, reason: string, actor: Actor, now: Date): boolean {
  if (payment.status !== "pending" && payment.status !== "to_verify") return false;
  run(
    db,
    "UPDATE member_payments SET status = 'failed', failure_reason = ?, verify_reason = NULL WHERE id = ?",
    reason,
    payment.id,
  );
  touchMemberPayment(db, payment.id, now);
  resolveExceptions(db, payment.company_id, ["payment_to_verify"], payment.id, "Échec confirmé par le prestataire.", now);
  recordAudit(
    db,
    actor,
    "member_payment.failed",
    "member_payment",
    payment.id,
    { method: payment.method, amountMinor: payment.amount_minor, reason },
    payment.company_id,
    now,
  );
  return true;
}

/**
 * Puts a pending payment aside for the finance team (unknown or inconsistent provider answer):
 * it is neither confirmed nor failed until someone checks. Returns false unless it was pending.
 */
export function markMemberPaymentToVerify(
  db: Db,
  payment: MemberPaymentRow,
  reason: string,
  actor: Actor,
  now: Date,
): boolean {
  if (payment.status !== "pending") return false;
  run(db, "UPDATE member_payments SET status = 'to_verify', verify_reason = ? WHERE id = ?", reason, payment.id);
  touchMemberPayment(db, payment.id, now);
  const member = get<Pick<MemberRow, "number">>(db, "SELECT number FROM members WHERE id = ?", payment.member_id)!;
  openException(
    db,
    payment.company_id,
    "finance",
    "payment_to_verify",
    "member_payment",
    payment.id,
    `Paiement en ligne à vérifier pour le membre ${member.number} : ${reason}`,
    {
      member: member.number,
      method: payment.method,
      amountMinor: payment.amount_minor,
      providerRef: payment.provider_ref,
    },
    now,
  );
  recordAudit(
    db,
    actor,
    "member_payment.to_verify",
    "member_payment",
    payment.id,
    { member: member.number, reason },
    payment.company_id,
    now,
  );
  return true;
}

const findByIdempotencyKey = (db: Db, companyId: string, key: string): MemberPaymentRow | undefined =>
  get<MemberPaymentRow>(db, "SELECT * FROM member_payments WHERE company_id = ? AND idempotency_key = ?", companyId, key);

export interface MemberPaymentResult {
  payment: MemberPaymentRow;
  /** True when the idempotency key (or a pending attempt) returned an existing payment. */
  replayed: boolean;
}

/** Cash handed in at the club desk: recorded and confirmed at once. Idempotent on the key. */
export function recordCashPayment(
  db: Db,
  actor: Actor,
  memberId: string,
  amountMinor: number,
  note: string,
  key: string,
  now: Date = new Date(),
): MemberPaymentResult {
  const companyId = actorCompanyId(actor);
  return transaction(db, () => {
    const member = requireMember(db, companyId, memberId);
    const existing = findByIdempotencyKey(db, companyId, key);
    if (existing) {
      if (existing.member_id !== member.id || existing.amount_minor !== amountMinor || existing.method !== "cash") {
        throw new ApiError(409, "idempotency_conflict", IDEMPOTENCY_CONFLICT);
      }
      return { payment: existing, replayed: true };
    }
    const id = newId("mpay");
    run(
      db,
      `INSERT INTO member_payments (id, company_id, member_id, method, amount_minor, currency, status, idempotency_key, reference, note, created_by, created_at, updated_at)
      VALUES (?,?,?,'cash',?,?,'pending',?,?,?,?,?,?)`,
      id,
      companyId,
      member.id,
      amountMinor,
      "MUR",
      key,
      member.reference,
      note,
      actor.id,
      iso(now),
      iso(now),
    );
    confirmMemberPayment(db, requireMemberPayment(db, companyId, id), "cash_desk", actor, now);
    return { payment: requireMemberPayment(db, companyId, id), replayed: false };
  });
}

interface LinkAttempt extends MemberPaymentResult {
  member: MemberRow;
}

/**
 * Online payment of the whole amount due, started from the member's public page. A pending
 * attempt is reused; an attempt waiting for verification blocks a new one (double debit risk).
 * The provider is called outside the transaction; if it fails the attempt is marked failed.
 */
export async function startLinkPayment(
  db: Db,
  connectors: ClubConnectors,
  companyId: string,
  memberId: string,
  key: string,
  origin: string,
  actor: Actor,
  now: Date = new Date(),
): Promise<MemberPaymentResult> {
  const settings = loadSettings(db, companyId);
  const attempt = transaction(db, (): LinkAttempt => {
    const member = requireMember(db, companyId, memberId);
    const existing = findByIdempotencyKey(db, companyId, key);
    if (existing) {
      if (existing.member_id !== member.id || existing.method !== "link") {
        throw new ApiError(409, "idempotency_conflict", IDEMPOTENCY_CONFLICT);
      }
      return { payment: existing, member, replayed: true };
    }
    if (!settings.payments.methods.link.enabled) {
      throw new ApiError(400, "method_disabled", "Le paiement en ligne n'est pas activé pour ce club.");
    }
    const inProgress = get<MemberPaymentRow>(
      db,
      "SELECT * FROM member_payments WHERE member_id = ? AND method = 'link' AND status IN ('pending','to_verify') ORDER BY created_at DESC LIMIT 1",
      member.id,
    );
    if (inProgress?.status === "pending") return { payment: inProgress, member, replayed: true };
    if (inProgress) {
      throw new ApiError(
        409,
        "attempt_in_progress",
        "Un paiement est à vérifier pour ce membre : nouvelle tentative bloquée pour éviter un double débit.",
      );
    }
    const dueMinor = memberAccount(db, member.id, businessDay(now)).dueMinor;
    if (dueMinor <= 0) throw new ApiError(409, "nothing_due", "Aucun montant n'est dû sur ce compte.");
    const id = newId("mpay");
    const expiresAt = new Date(now.getTime() + settings.payments.attemptMinutes * 60_000);
    run(
      db,
      `INSERT INTO member_payments (id, company_id, member_id, method, amount_minor, currency, status, idempotency_key, reference, created_by, created_at, updated_at, expires_at)
      VALUES (?,?,?,'link',?,?,'pending',?,?,?,?,?,?)`,
      id,
      companyId,
      member.id,
      dueMinor,
      "MUR",
      key,
      member.reference,
      actor.id,
      iso(now),
      iso(now),
      iso(expiresAt),
    );
    recordAudit(
      db,
      actor,
      "member_payment.initiated",
      "member_payment",
      id,
      { member: member.number, method: "link", amountMinor: dueMinor },
      companyId,
      now,
    );
    return { payment: requireMemberPayment(db, companyId, id), member, replayed: false };
  });
  if (attempt.replayed) return { payment: attempt.payment, replayed: true };

  const payment = attempt.payment;
  try {
    const { providerRef } = await connectors.payments.link.initiate({
      paymentId: payment.id,
      idempotencyKey: payment.idempotency_key,
      companyId,
      merchantRef: settings.payments.methods.link.merchantRef,
      amountMinor: payment.amount_minor,
      currency: payment.currency,
      invoiceNumber: attempt.member.reference,
      payUrl: `${origin}/membre/${attempt.member.portal_token}`,
      expiresAt: new Date(payment.expires_at!),
    });
    run(db, "UPDATE member_payments SET provider_ref = ? WHERE id = ?", providerRef, payment.id);
  } catch (error) {
    transaction(db, () => failMemberPayment(db, payment, "Le prestataire n'a pas pu initier le paiement.", actor, now));
    console.error("Initiation de paiement membre en échec :", error instanceof Error ? error.message : "erreur inconnue");
  }
  return { payment: requireMemberPayment(db, companyId, payment.id), replayed: false };
}

/** Asks the provider for the status of an open online payment and applies the answer. */
export async function checkMemberPaymentStatus(
  db: Db,
  connectors: ClubConnectors,
  actor: Actor,
  paymentId: string,
  now: Date = new Date(),
): Promise<MemberPaymentRow> {
  const companyId = actorCompanyId(actor);
  const payment = requireMemberPayment(db, companyId, paymentId);
  const open = payment.status === "pending" || payment.status === "to_verify";
  if (payment.method === "link" && open && payment.provider_ref) {
    const status = await connectors.payments.link.queryStatus(payment.provider_ref);
    transaction(db, () => {
      const current = requireMemberPayment(db, companyId, paymentId);
      if (status === "succeeded") confirmMemberPayment(db, current, "status_query", actor, now);
      else if (status === "failed") failMemberPayment(db, current, "Refusé ou annulé chez le prestataire.", actor, now);
      else if (status === "unknown") {
        markMemberPaymentToVerify(db, current, "Le prestataire ne connaît pas cette référence.", actor, now);
      } else if (current.expires_at && iso(now) > current.expires_at) {
        markMemberPaymentToVerify(db, current, "Sans réponse du prestataire après expiration du délai.", actor, now);
      }
    });
  }
  return requireMemberPayment(db, companyId, paymentId);
}

export interface NotificationOutcome {
  result: "amount_mismatch" | "confirmed" | "already_confirmed" | "failed" | "ignored";
  paymentId: string;
  companyId: string;
}

/**
 * Applies a verified provider notification to the member payment it refers to; null when the
 * reference is not a member payment (the caller then tries invoice payments). A notification
 * whose amount or currency differs from the request never confirms the payment.
 */
export function applyMemberPaymentNotification(
  db: Db,
  method: string,
  notification: ProviderNotification,
  now: Date,
): NotificationOutcome | null {
  const payment = get<MemberPaymentRow>(
    db,
    "SELECT * FROM member_payments WHERE method = ? AND provider_ref = ?",
    method,
    notification.providerRef,
  );
  if (!payment) return null;
  let result: NotificationOutcome["result"];
  if (notification.amountMinor !== payment.amount_minor || notification.currency !== payment.currency) {
    result = "amount_mismatch";
    markMemberPaymentToVerify(db, payment, "Montant ou devise notifié différent de la demande.", SYSTEM_ACTOR, now);
    openException(
      db,
      payment.company_id,
      "finance",
      "amount_mismatch",
      "member_payment",
      payment.id,
      `Notification ${method} incohérente : ${formatMinor(notification.amountMinor)} ${notification.currency} notifié pour ${formatMinor(payment.amount_minor)} ${payment.currency} demandé.`,
      {
        providerRef: payment.provider_ref,
        notifiedMinor: notification.amountMinor,
        expectedMinor: payment.amount_minor,
      },
      now,
    );
  } else if (notification.type === "payment.succeeded") {
    result = confirmMemberPayment(db, payment, "notification", SYSTEM_ACTOR, now) ? "confirmed" : "already_confirmed";
  } else {
    const reason = notification.failureReason ?? "Refusé par le prestataire.";
    result = failMemberPayment(db, payment, reason, SYSTEM_ACTOR, now) ? "failed" : "ignored";
  }
  return { result, paymentId: payment.id, companyId: payment.company_id };
}

export interface MemberPaymentFilters {
  status?: string | undefined;
  method?: string | undefined;
}

/** Latest 500 member payments of a club, newest first. */
export function listMemberPayments(db: Db, companyId: string, filters: MemberPaymentFilters = {}): Row[] {
  const where = ["p.company_id = ?"];
  const params: string[] = [companyId];
  if (filters.status) {
    where.push("p.status = ?");
    params.push(filters.status);
  }
  if (filters.method) {
    where.push("p.method = ?");
    params.push(filters.method);
  }
  return all(
    db,
    `SELECT p.id, p.created_at, p.confirmed_at, p.settled_at, p.method, p.amount_minor, p.status, p.settlement_status, p.provider_ref, p.reference, p.confirmed_via,
      p.failure_reason, p.verify_reason, p.fee_actual_minor, p.note, m.id AS member_id, m.number AS member_number, m.name AS member
    FROM member_payments p JOIN members m ON m.id = p.member_id WHERE ${where.join(" AND ")} ORDER BY p.created_at DESC, p.rowid DESC LIMIT 500`,
    ...params,
  );
}
