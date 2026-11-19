// Member account: payments are allocated to the oldest charges first, and the balance, the amount
// overdue and its age are derived from the charges and confirmed payments.
import { type Db, all, get, run } from "../../core/db.ts";
import { daysBetween } from "./dates.ts";
import type { CountRow, MemberChargeRow } from "./types.ts";

const confirmedPaidMinor = (db: Db, memberId: string): number =>
  get<CountRow>(
    db,
    "SELECT COALESCE(SUM(amount_minor), 0) AS n FROM member_payments WHERE member_id = ? AND status = 'confirmed'",
    memberId,
  )!.n;

/**
 * Recomputes `allocated_minor` and the open/paid status of every live charge of a member: the
 * confirmed payments are spread over the charges by due date, then creation (oldest first).
 * Called after any change to the charges or payments; never edited by hand.
 */
export function reallocatePayments(db: Db, memberId: string): void {
  let available = confirmedPaidMinor(db, memberId);
  const charges = all<MemberChargeRow>(
    db,
    "SELECT * FROM member_charges WHERE member_id = ? AND status != 'cancelled' ORDER BY due_date, created_at, rowid",
    memberId,
  );
  for (const charge of charges) {
    const allocated = Math.min(charge.amount_minor, Math.max(available, 0));
    available -= allocated;
    run(
      db,
      "UPDATE member_charges SET allocated_minor = ?, status = ? WHERE id = ?",
      allocated,
      allocated >= charge.amount_minor ? "paid" : "open",
      charge.id,
    );
  }
}

export interface MemberAccount {
  chargedMinor: number;
  paidMinor: number;
  /** Charged minus paid: positive when the member owes, negative when in credit. */
  balanceMinor: number;
  dueMinor: number;
  creditMinor: number;
  /** Unpaid part of the open charges whose due date has passed. */
  overdueMinor: number;
  /** Age in days of the oldest overdue charge. */
  overdueDays: number;
  /** Oldest overdue charge: identifies a reminder cycle. */
  oldestOverdueId: string | null;
}

interface OverdueChargeRow {
  id: string;
  due_date: string;
  rest: number;
}

/** Account summary of a member on a business day. */
export function memberAccount(db: Db, memberId: string, day: string): MemberAccount {
  const chargedMinor = get<CountRow>(
    db,
    "SELECT COALESCE(SUM(amount_minor), 0) AS n FROM member_charges WHERE member_id = ? AND status != 'cancelled'",
    memberId,
  )!.n;
  const paidMinor = confirmedPaidMinor(db, memberId);
  const overdue = all<OverdueChargeRow>(
    db,
    "SELECT id, due_date, amount_minor - allocated_minor AS rest FROM member_charges WHERE member_id = ? AND status = 'open' AND due_date < ? ORDER BY due_date, created_at, rowid",
    memberId,
    day,
  );
  const balanceMinor = chargedMinor - paidMinor;
  const oldest = overdue[0];
  return {
    chargedMinor,
    paidMinor,
    balanceMinor,
    dueMinor: Math.max(balanceMinor, 0),
    creditMinor: Math.max(-balanceMinor, 0),
    overdueMinor: overdue.reduce((sum, charge) => sum + charge.rest, 0),
    overdueDays: oldest ? daysBetween(oldest.due_date, day) : 0,
    oldestOverdueId: oldest?.id ?? null,
  };
}
