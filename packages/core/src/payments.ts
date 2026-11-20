// Electronic payment attempts: when one may start, how the provider's answers move it, refunds.
//
//   pending ──notification / status query (amount as requested)──▶ confirmed ──refunds──▶ refunded
//      │  ├──provider failure, cancellation─────────────────────▶ failed
//      │  └──amount differs, customer claim, no answer, unknown──▶ to_verify ──provider proof──▶ confirmed
//      └ one attempt pending or to verify per invoice at most (no double debit)
//
// "Confirmed" is a proof from the provider only (ConfirmationSource): never the driver, never a
// screenshot shown by the customer. Bank settlement is a separate state (Settlement).

import { balanceDue, type InvoiceAmounts } from "./invoices.ts";
import { conflict, invalid } from "./rule-error.ts";

export type PaymentStatus = "pending" | "to_verify" | "confirmed" | "failed" | "refunded";

/**
 * The only ways a payment becomes confirmed: the provider's signed notification, the provider's
 * answer to a status query, or the credit on the bank statement. There is deliberately no source
 * for a person (driver, cashier, finance).
 */
export type ConfirmationSource = "notification" | "status_query" | "bank_statement";
export const CONFIRMATION_SOURCES: readonly ConfirmationSource[] = ["notification", "status_query", "bank_statement"];

/** Settlement on the bank account, independent of the confirmation. */
export type Settlement = "unsettled" | "settled";

/** An attempt that blocks a new one on the same invoice. */
export const isInProgress = (status: PaymentStatus): boolean => status === "pending" || status === "to_verify";

export interface AttemptRequest {
  invoiceId: string;
  method: string;
  amountMinor: number;
}

/** A request replayed with an idempotency key already used must be the same request. */
export function checkReplay(previous: AttemptRequest, request: AttemptRequest): void {
  if (previous.invoiceId !== request.invoiceId || previous.amountMinor !== request.amountMinor || previous.method !== request.method) {
    throw conflict("idempotency_conflict", "Cette clé d'idempotence a déjà servi pour une autre demande.");
  }
}

export interface NewAttempt {
  methodEnabled: boolean;
  /** Status of the invoice's attempt in progress, if any. */
  inProgress: "pending" | "to_verify" | null;
  invoice: InvoiceAmounts;
  amountMinor: number;
}

/** A new attempt: method enabled, no attempt in progress on the invoice, amount within the balance. */
export function checkNewAttempt(attempt: NewAttempt): void {
  if (!attempt.methodEnabled) throw invalid("method_disabled", "Ce moyen de paiement n'est pas activé pour l'entreprise.");
  if (attempt.inProgress === "pending") {
    throw conflict("attempt_in_progress", "Un paiement est déjà en attente pour cette facture. Vérifiez son statut avant d'en lancer un autre.");
  }
  if (attempt.inProgress === "to_verify") {
    throw conflict("attempt_in_progress", "Un paiement est à vérifier pour cette facture : nouvelle tentative bloquée pour éviter un double débit.");
  }
  const balance = balanceDue(attempt.invoice);
  if (balance <= 0) throw conflict("already_paid", "Cette facture est déjà payée.");
  if (attempt.amountMinor > balance) throw invalid("amount_exceeds_balance", "Le montant dépasse le solde restant dû.");
}

/** Deadline of an attempt, from the company's attempt time. */
export const attemptDeadline = (createdAt: Date, attemptMinutes: number): Date => new Date(createdAt.getTime() + attemptMinutes * 60_000);

// ───────── transitions ─────────

/** Confirmation applies once: a confirmed or refunded payment stays as it is. */
export const canConfirm = (status: PaymentStatus): boolean => status !== "confirmed" && status !== "refunded";
/** Only an attempt in progress can fail. */
export const canFail = (status: PaymentStatus): boolean => isInProgress(status);
/** Only a pending attempt goes "to verify" (a payment already to verify stays so, with its first reason). */
export const canMarkToVerify = (status: PaymentStatus): boolean => status === "pending";

export interface RequestedAmount {
  amountMinor: number;
  currency: string;
}

/** The provider reports the amount and currency requested: the only case a confirmation is allowed. */
export const sameAmount = (requested: RequestedAmount, reported: RequestedAmount): boolean =>
  requested.amountMinor === reported.amountMinor && requested.currency === reported.currency;

export type ProviderDecision =
  | { action: "confirm" }
  | { action: "fail"; reason: string }
  | { action: "to_verify"; reason: string; amountMismatch?: boolean }
  | { action: "none" };

export const AMOUNT_MISMATCH_REASON = "Montant ou devise notifié différent de la demande.";

export interface Notification extends RequestedAmount {
  type: "payment.succeeded" | "payment.failed";
  failureReason?: string | undefined;
}

/**
 * What a verified provider notification does. An amount or currency other than requested is never
 * confirmed: the attempt goes to verification. A duplicate is filtered before (event id).
 */
export function notificationDecision(payment: RequestedAmount, notification: Notification): ProviderDecision {
  if (!sameAmount(payment, notification)) return { action: "to_verify", reason: AMOUNT_MISMATCH_REASON, amountMismatch: true };
  if (notification.type === "payment.succeeded") return { action: "confirm" };
  return { action: "fail", reason: notification.failureReason ?? "Refusé par le prestataire." };
}

export type ProviderStatus = "pending" | "succeeded" | "failed" | "unknown";

/** Answer of the provider to a status query. The amount is the one the provider received, when it reports it. */
export interface StatusReport {
  status: ProviderStatus;
  amountMinor: number | null;
  currency: string | null;
}

export const REFUSED_BY_PROVIDER = "Refusé ou annulé chez le prestataire.";
export const STATUS_AMOUNT_MISMATCH_REASON = "Montant ou devise reçu par le prestataire différent de la demande.";

export interface AttemptInProgress extends RequestedAmount {
  status: PaymentStatus;
  /** ISO time after which a still-pending attempt needs a human check. */
  expiresAt: string | null;
}

/**
 * What a status query answer does. As for a notification, a success is confirmed only for the
 * amount requested: a different amount keeps the attempt to verify.
 */
export function statusQueryDecision(payment: AttemptInProgress, report: StatusReport, now: Date): ProviderDecision {
  if (report.status === "succeeded") {
    const reported = { amountMinor: report.amountMinor ?? payment.amountMinor, currency: report.currency ?? payment.currency };
    return sameAmount(payment, reported) ? { action: "confirm" } : { action: "to_verify", reason: STATUS_AMOUNT_MISMATCH_REASON, amountMismatch: true };
  }
  if (report.status === "failed") return { action: "fail", reason: REFUSED_BY_PROVIDER };
  if (report.status === "unknown") return { action: "to_verify", reason: "Le prestataire ne connaît pas cette référence." };
  // Still pending at the provider: past the attempt deadline, a human has to check it.
  if (payment.expiresAt && now.toISOString() > payment.expiresAt) return { action: "to_verify", reason: "Sans réponse du prestataire après expiration du délai." };
  return { action: "none" };
}

/** Only a pending attempt may be cancelled. */
export function checkCancel(status: PaymentStatus): void {
  if (status !== "pending") throw conflict("bad_status", "Seule une tentative en attente peut être annulée.");
}

/**
 * The customer shows a proof (a screenshot, an SMS): it is never a confirmation. A pending attempt
 * goes to verify; finance cannot confirm it by hand either, only the provider's proof does.
 */
export function claimDecision(status: PaymentStatus): ProviderDecision {
  if (status !== "pending") throw conflict("bad_status", "Cette tentative n'est plus en attente.");
  return { action: "to_verify", reason: "Preuve présentée par le client (capture d'écran) sans confirmation du prestataire." };
}

// ───────── refunds ─────────

export interface Refundable {
  status: PaymentStatus;
  amountMinor: number;
  refundedMinor: number;
}

/** A refund: of a confirmed payment only, positive and within what is left to refund. */
export function checkRefund(payment: Refundable, amountMinor: number): void {
  if (payment.status !== "confirmed") throw conflict("bad_status", "Seul un paiement confirmé peut être remboursé.");
  if (amountMinor <= 0 || amountMinor > payment.amountMinor - payment.refundedMinor) {
    throw invalid("amount_exceeds_balance", "Montant supérieur au solde remboursable.");
  }
}

/** Status after a refund: refunded once nothing is left. */
export const statusAfterRefund = (payment: Refundable, amountMinor: number): PaymentStatus =>
  payment.refundedMinor + amountMinor >= payment.amountMinor ? "refunded" : payment.status;

/** Provider idempotency key (and accounting entry id) of a refund: `<payment id>:<refunded before>`. */
export const refundKey = (paymentId: string, refundedBeforeMinor: number): string => `${paymentId}:${refundedBeforeMinor}`;
