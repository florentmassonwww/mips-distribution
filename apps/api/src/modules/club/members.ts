// Club members: creation (number, payment reference, badge), updates, the searchable list with
// balances and arrears, and the member's detail page.
import { z } from "zod";
import type { Actor } from "../../core/actor.ts";
import { recordAudit } from "../../core/audit.ts";
import { type Db, all, get, run, transaction } from "../../core/db.ts";
import { ApiError, notFound } from "../../core/errors.ts";
import { newId, newToken } from "../../core/ids.ts";
import { businessDay, iso } from "../../core/time.ts";
import { memberAccount } from "./allocation.ts";
import { daysBetween } from "./dates.ts";
import { accessDecision } from "./gate.ts";
import { loadSettings } from "./legacy-deps.ts";
import { paymentReference } from "./references.ts";
import { actorCompanyId, portalPath, requireMember } from "./shared.ts";
import type { MemberChargeRow, MemberPaymentRow, MemberRow, MemberStatus } from "./types.ts";

const optionalEmail = z.union([z.email().max(120), z.literal("")]);

export const createMemberInput = z.object({
  name: z.string().min(2).max(80),
  email: optionalEmail.default(""),
  phone: z.string().max(30).default(""),
  planId: z.string().nullable(),
  badge: z.string().regex(/^[A-Za-z0-9-]{3,24}$/).optional(),
});
export type CreateMemberInput = z.infer<typeof createMemberInput>;

export const updateMemberInput = z.object({
  status: z.enum(["active", "suspended", "resigned"]).optional(),
  planId: z.string().nullable().optional(),
  email: optionalEmail.optional(),
  phone: z.string().max(30).optional(),
});
export type UpdateMemberInput = z.infer<typeof updateMemberInput>;

/**
 * Creates a member: next number of the club (5 digits), payment reference with check digits,
 * badge (given, or `B` + number), and the token of the member's public page.
 */
export function createMember(
  db: Db,
  actor: Actor,
  input: CreateMemberInput,
  now: Date = new Date(),
): { id: string; number: string; reference: string } {
  const companyId = actorCompanyId(actor);
  return transaction(db, () => {
    if (input.planId && !get(db, "SELECT 1 FROM club_plans WHERE id = ? AND company_id = ? AND active = 1", input.planId, companyId)) {
      throw notFound("Catégorie d'adhésion");
    }
    run(
      db,
      "INSERT INTO counters (company_id, name, value) VALUES (?, 'member', 1) ON CONFLICT (company_id, name) DO UPDATE SET value = value + 1",
      companyId,
    );
    const counter = get<{ value: number }>(db, "SELECT value FROM counters WHERE company_id = ? AND name = 'member'", companyId)!;
    const number = String(counter.value).padStart(5, "0");
    const badge = (input.badge?.trim() || `B${number}`).toUpperCase();
    if (get(db, "SELECT 1 FROM members WHERE company_id = ? AND badge = ?", companyId, badge)) {
      throw new ApiError(409, "badge_taken", "Ce badge est déjà attribué à un autre membre.");
    }
    const reference = paymentReference(loadSettings(db, companyId).club.refPrefix, number);
    // Random draws: member id, then portal token.
    const id = newId("mbr");
    const portalToken = newToken();
    run(
      db,
      "INSERT INTO members (id, company_id, number, name, email, phone, plan_id, reference, badge, portal_token, joined_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
      id,
      companyId,
      number,
      input.name.trim(),
      input.email.trim().toLowerCase(),
      input.phone.trim(),
      input.planId,
      reference,
      badge,
      portalToken,
      businessDay(now),
      iso(now),
    );
    recordAudit(db, actor, "member.created", "member", id, { number, name: input.name }, companyId, now);
    return { id, number, reference };
  });
}

/** Updates the given fields only (status, plan, email, phone). */
export function updateMember(
  db: Db,
  actor: Actor,
  memberId: string,
  input: UpdateMemberInput,
  now: Date = new Date(),
): void {
  const companyId = actorCompanyId(actor);
  transaction(db, () => {
    const member = requireMember(db, companyId, memberId);
    // Unlike creation, an inactive plan is accepted (members keep the plan they joined with).
    if (input.planId && !get(db, "SELECT 1 FROM club_plans WHERE id = ? AND company_id = ?", input.planId, companyId)) {
      throw notFound("Catégorie d'adhésion");
    }
    if (input.status) run(db, "UPDATE members SET status = ? WHERE id = ?", input.status, member.id);
    if (input.planId !== undefined) run(db, "UPDATE members SET plan_id = ? WHERE id = ?", input.planId, member.id);
    if (input.email !== undefined) {
      run(db, "UPDATE members SET email = ? WHERE id = ?", input.email.trim().toLowerCase(), member.id);
    }
    if (input.phone !== undefined) run(db, "UPDATE members SET phone = ? WHERE id = ?", input.phone.trim(), member.id);
    recordAudit(db, actor, "member.updated", "member", member.id, { number: member.number, ...input }, companyId, now);
  });
}

export interface MemberListItem {
  id: string;
  number: string;
  name: string;
  email: string;
  phone: string;
  plan: string | null;
  status: MemberStatus;
  reference: string;
  badge: string;
  balance_minor: number;
  overdue_minor: number;
  overdue_days: number;
  last_reminder_level: number | null;
  last_reminder_at: string | null;
}

export interface MemberListOptions {
  /** Search in number, name, payment reference and badge. */
  q?: string | undefined;
  /** `arrears`: only members with an overdue amount. */
  filter?: string | undefined;
  /** `age` (oldest debt first, then amount overdue) or `amount` (balance); number order otherwise. */
  sort?: string | undefined;
}

interface MemberListRow extends MemberRow {
  plan: string | null;
  charged: number;
  paid: number;
  overdue: number;
  oldest_due: string | null;
  /** `level|sent_at` of the latest reminder (statements excluded). */
  last_reminder: string | null;
}

/** Members of a club with their balance and arrears on the business day of `now`. */
export function listMembers(db: Db, companyId: string, now: Date, options: MemberListOptions = {}): MemberListItem[] {
  const day = businessDay(now);
  const rows = all<MemberListRow>(
    db,
    `SELECT m.*, p.name AS plan,
      (SELECT COALESCE(SUM(amount_minor), 0) FROM member_charges WHERE member_id = m.id AND status != 'cancelled') AS charged,
      (SELECT COALESCE(SUM(amount_minor), 0) FROM member_payments WHERE member_id = m.id AND status = 'confirmed') AS paid,
      (SELECT COALESCE(SUM(amount_minor - allocated_minor), 0) FROM member_charges WHERE member_id = m.id AND status = 'open' AND due_date < ?) AS overdue,
      (SELECT MIN(due_date) FROM member_charges WHERE member_id = m.id AND status = 'open' AND due_date < ?) AS oldest_due,
      (SELECT level || '|' || sent_at FROM member_reminders WHERE member_id = m.id AND level > 0 ORDER BY sent_at DESC, rowid DESC LIMIT 1) AS last_reminder
    FROM members m LEFT JOIN club_plans p ON p.id = m.plan_id WHERE m.company_id = ? ORDER BY m.number`,
    day,
    day,
    companyId,
  );
  const query = options.q?.trim().toLowerCase();
  const items = rows
    .map(
      (row): MemberListItem => ({
        id: row.id,
        number: row.number,
        name: row.name,
        email: row.email,
        phone: row.phone,
        plan: row.plan,
        status: row.status,
        reference: row.reference,
        badge: row.badge,
        balance_minor: row.charged - row.paid,
        overdue_minor: row.overdue,
        overdue_days: row.oldest_due ? daysBetween(row.oldest_due, day) : 0,
        last_reminder_level: row.last_reminder ? Number(row.last_reminder.split("|")[0]) : null,
        last_reminder_at: row.last_reminder?.split("|")[1] ?? null,
      }),
    )
    .filter(
      (item) =>
        (!query || `${item.number} ${item.name} ${item.reference} ${item.badge}`.toLowerCase().includes(query)) &&
        (options.filter !== "arrears" || item.overdue_minor > 0),
    );
  if (options.sort === "age") {
    items.sort((a, b) => b.overdue_days - a.overdue_days || b.overdue_minor - a.overdue_minor);
  } else if (options.sort === "amount") {
    items.sort((a, b) => b.balance_minor - a.balance_minor);
  }
  return items;
}

interface StatementEntry {
  at: string;
  ref: string;
  label: string;
  debit: number;
  credit: number;
}

/** Detail page of a member: account, gate status, charges, payments, statement, reminders, gate events. */
export function memberDetail(db: Db, companyId: string, memberId: string, now: Date = new Date()) {
  const member = requireMember(db, companyId, memberId);
  const day = businessDay(now);
  const charges = all<MemberChargeRow>(
    db,
    "SELECT * FROM member_charges WHERE member_id = ? ORDER BY due_date DESC, created_at DESC, rowid DESC",
    member.id,
  );
  const payments = all<MemberPaymentRow>(
    db,
    "SELECT * FROM member_payments WHERE member_id = ? ORDER BY created_at DESC, rowid DESC",
    member.id,
  );
  // Statement: live charges and confirmed payments in time order, with the running balance.
  const entries: StatementEntry[] = [
    ...charges
      .filter((charge) => charge.status !== "cancelled")
      .map((charge) => ({ at: charge.created_at, ref: charge.number, label: charge.label, debit: charge.amount_minor, credit: 0 })),
    ...payments
      .filter((payment) => payment.status === "confirmed")
      .map((payment) => ({
        at: payment.confirmed_at!,
        ref: payment.provider_ref ?? payment.reference,
        label: `Encaissement (${payment.method})`,
        debit: 0,
        credit: payment.amount_minor,
      })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  let balance = 0;
  const statement = entries.map((entry) => ({ ...entry, balance: (balance += entry.debit - entry.credit) }));
  return {
    member: {
      ...member,
      // Hidden from the back office: the token is the member's credential for the public page.
      portal_token: undefined,
      plan: member.plan_id
        ? get(db, "SELECT id, name, billing, fee_minor FROM club_plans WHERE id = ?", member.plan_id)
        : null,
    },
    account: memberAccount(db, member.id, day),
    portalPath: portalPath(member),
    gate: accessDecision(db, companyId, member.badge, now),
    charges: charges.map((charge) => ({
      ...charge,
      remaining_minor: charge.status === "cancelled" ? 0 : charge.amount_minor - charge.allocated_minor,
      overdue: charge.status === "open" && charge.due_date < day,
    })),
    payments: payments.map((payment) => ({ ...payment, idempotency_key: undefined })),
    statement: statement.reverse(),
    reminders: all(
      db,
      "SELECT id, level, channel, amount_minor, overdue_days, message, sent_at FROM member_reminders WHERE member_id = ? ORDER BY sent_at DESC, rowid DESC LIMIT 30",
      member.id,
    ),
    gateEvents: all(
      db,
      "SELECT id, decision, reason, source, at, overdue_minor, overdue_days FROM gate_events WHERE member_id = ? ORDER BY at DESC, rowid DESC LIMIT 20",
      member.id,
    ),
  };
}
