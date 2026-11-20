// Club member accounts: allocation of payments, overdue amounts, reminders, gate access.

import { daysBetween } from "./calendar.ts";

export interface Charge {
  id: string;
  amountMinor: number;
  /** Due date, YYYY-MM-DD. */
  dueDate: string;
}

export interface Allocation {
  id: string;
  allocatedMinor: number;
  status: "open" | "paid";
}

/**
 * Spreads the confirmed payments over the live charges, oldest first (the caller passes them
 * ordered by due date, then creation). A charge is paid once fully allocated.
 */
export function allocatePayments(paidMinor: number, charges: readonly Charge[]): Allocation[] {
  let available = paidMinor;
  return charges.map((charge) => {
    const allocatedMinor = Math.min(charge.amountMinor, Math.max(available, 0));
    available -= allocatedMinor;
    return { id: charge.id, allocatedMinor, status: allocatedMinor >= charge.amountMinor ? "paid" : "open" };
  });
}


export interface OpenCharge {
  id: string;
  dueDate: string;
  /** Part not yet allocated. */
  restMinor: number;
}

export interface Overdue {
  overdueMinor: number;
  /** Age in days of the oldest overdue charge. */
  overdueDays: number;
  /** Oldest overdue charge: identifies a reminder cycle. */
  oldestOverdueId: string | null;
}

/** Overdue part of a member's account on a day: open charges whose due date has passed (oldest first). */
export function overdue(openCharges: readonly OpenCharge[], day: string): Overdue {
  const late = openCharges.filter((charge) => charge.dueDate < day);
  const oldest = late[0];
  return {
    overdueMinor: late.reduce((sum, charge) => sum + charge.restMinor, 0),
    overdueDays: oldest ? daysBetween(oldest.dueDate, day) : 0,
    oldestOverdueId: oldest?.id ?? null,
  };
}

/**
 * Reminder level reached: the number of thresholds (days overdue) reached, 0 when below the
 * amount threshold. One reminder per member, per cycle and per level.
 */
export function reminderLevel(account: Overdue, minAmountMinor: number, levels: readonly number[]): number {
  if (!account.oldestOverdueId || account.overdueMinor < minAmountMinor) return 0;
  return levels.filter((days) => account.overdueDays >= days).length;
}

export type GateDecision = "allow" | "flag" | "deny";
export type MemberStatus = "active" | "suspended" | "resigned";

export interface GateRules {
  minAmountMinor: number;
  flagAfterDays: number;
  /** 0 disables denial: late members are then only flagged. */
  denyAfterDays: number;
}

/**
 * Gate access: resigned or suspended members are denied; above the amount threshold, a debt older
 * than `denyAfterDays` denies, older than `flagAfterDays` flags (let in, sent to the desk).
 */
export function gateDecision(status: MemberStatus, account: Overdue, rules: GateRules): { decision: GateDecision; cause: "resigned" | "suspended" | "overdue" | "up_to_date" } {
  if (status === "resigned") return { decision: "deny", cause: "resigned" };
  if (status === "suspended") return { decision: "deny", cause: "suspended" };
  const aboveThreshold = account.overdueMinor >= rules.minAmountMinor;
  if (aboveThreshold && rules.denyAfterDays > 0 && account.overdueDays >= rules.denyAfterDays) return { decision: "deny", cause: "overdue" };
  if (aboveThreshold && account.overdueDays >= rules.flagAfterDays) return { decision: "flag", cause: "overdue" };
  return { decision: "allow", cause: "up_to_date" };
}
