// Club dashboard: amounts owed and overdue, aging of open charges, collections of the month,
// reminders, open finance exceptions, gate decisions of the day and the largest debtors.
import type { SQLInputValue } from "node:sqlite";
import { type Db, all, get } from "../../core/db.ts";
import { businessDay, iso } from "../../core/time.ts";
import { daysBetween, startOfBusinessDay } from "./dates.ts";
import { listMembers } from "./members.ts";
import type { CountRow, GateDecision } from "./types.ts";

/** Aging buckets of open charges, by days past due (inclusive bounds). */
const AGING_BUCKETS: Array<[name: string, fromDays: number, toDays: number]> = [
  ["current", -Infinity, 0],
  ["d1_30", 1, 30],
  ["d31_60", 31, 60],
  ["d61_90", 61, 90],
  ["d90", 91, Infinity],
];

const GATE_DECISIONS: GateDecision[] = ["allow", "flag", "deny"];

export function clubDashboard(db: Db, companyId: string, now: Date = new Date()) {
  const day = businessDay(now);
  const members = listMembers(db, companyId, now);

  const aging: Record<string, number> = Object.fromEntries(AGING_BUCKETS.map(([name]) => [name, 0]));
  const open = all<{ due_date: string; rest: number }>(
    db,
    "SELECT due_date, amount_minor - allocated_minor AS rest FROM member_charges WHERE company_id = ? AND status = 'open'",
    companyId,
  );
  for (const charge of open) {
    const age = daysBetween(charge.due_date, day);
    const [bucket] = AGING_BUCKETS.find(([, from, to]) => age >= from && age <= to)!;
    aging[bucket]! += charge.rest;
  }

  const monthStart = iso(startOfBusinessDay(`${day.slice(0, 7)}-01`));
  const count = (sql: string, ...params: SQLInputValue[]): number => get<CountRow>(db, sql, companyId, ...params)!.n;
  const gateToday = all<{ decision: GateDecision; n: number }>(
    db,
    "SELECT decision, COUNT(*) AS n FROM gate_events WHERE company_id = ? AND at >= ? GROUP BY decision",
    companyId,
    iso(startOfBusinessDay(day)),
  );
  return {
    day,
    generatedAt: iso(now),
    totals: {
      owedMinor: members.reduce((sum, member) => sum + Math.max(member.balance_minor, 0), 0),
      overdueMinor: members.reduce((sum, member) => sum + member.overdue_minor, 0),
      creditMinor: members.reduce((sum, member) => sum + Math.max(-member.balance_minor, 0), 0),
      members: members.filter((member) => member.status === "active").length,
      inArrears: members.filter((member) => member.overdue_minor > 0).length,
    },
    aging,
    collectedMonth: all(
      db,
      `SELECT method, COUNT(*) AS count, SUM(amount_minor) AS amount_minor FROM member_payments WHERE company_id = ? AND status = 'confirmed' AND confirmed_at >= ?
      GROUP BY method ORDER BY method`,
      companyId,
      monthStart,
    ),
    unsettledOnlineMinor: count(
      "SELECT COALESCE(SUM(amount_minor), 0) AS n FROM member_payments WHERE company_id = ? AND method = 'link' AND status = 'confirmed' AND settlement_status = 'unsettled'",
    ),
    remindersMonth: count(
      "SELECT COUNT(*) AS n FROM member_reminders WHERE company_id = ? AND level > 0 AND sent_at >= ?",
      monthStart,
    ),
    openExceptions: count(
      "SELECT COUNT(*) AS n FROM exceptions WHERE company_id = ? AND status = 'open' AND domain = 'finance'",
    ),
    gateToday: Object.fromEntries(
      GATE_DECISIONS.map((decision) => [decision, gateToday.find((row) => row.decision === decision)?.n ?? 0]),
    ),
    topDebtors: members
      .filter((member) => member.overdue_minor > 0)
      .sort((a, b) => b.overdue_minor - a.overdue_minor)
      .slice(0, 8),
  };
}
