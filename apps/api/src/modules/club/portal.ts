// Public member page (reached with the member's portal token, no sign-in): what is due, what is
// overdue, the open charges and the last online payment attempt.
import { type Db, all, get } from "../../core/db.ts";
import { notFound } from "../../core/errors.ts";
import { businessDay } from "../../core/time.ts";
import { memberAccount } from "./allocation.ts";
import type { MemberPaymentRow, MemberRow } from "./types.ts";

export function requireMemberByPortalToken(db: Db, token: string): MemberRow {
  const member = get<MemberRow>(db, "SELECT * FROM members WHERE portal_token = ?", token);
  if (!member) throw notFound("Compte membre");
  return member;
}

/** First name only (a trailing "(…)" remark removed): the page is public, the full name is not shown. */
const firstName = (name: string): string => name.replace(/\s*\(.*\)$/, "").split(" ")[0]!;

export function memberPortal(db: Db, token: string, now: Date = new Date()) {
  const member = get<MemberRow & { club: string }>(
    db,
    "SELECT m.*, c.name AS club FROM members m JOIN companies c ON c.id = m.company_id WHERE m.portal_token = ?",
    token,
  );
  if (!member) throw notFound("Compte membre");
  const day = businessDay(now);
  const account = memberAccount(db, member.id, day);
  const lastPayment = get<MemberPaymentRow>(
    db,
    "SELECT * FROM member_payments WHERE member_id = ? AND method = 'link' ORDER BY created_at DESC, rowid DESC LIMIT 1",
    member.id,
  );
  return {
    club: member.club,
    number: member.number,
    firstName: firstName(member.name),
    status: member.status,
    reference: member.reference,
    dueMinor: account.dueMinor,
    overdueMinor: account.overdueMinor,
    overdueDays: account.overdueDays,
    creditMinor: account.creditMinor,
    open: all<{ label: string; due_date: string; rest: number }>(
      db,
      "SELECT label, due_date, amount_minor - allocated_minor AS rest FROM member_charges WHERE member_id = ? AND status = 'open' ORDER BY due_date, rowid",
      member.id,
    ).map((charge) => ({
      label: charge.label,
      dueDate: charge.due_date,
      remainingMinor: charge.rest,
      overdue: charge.due_date < day,
    })),
    lastPayment: lastPayment
      ? { status: lastPayment.status, amountMinor: lastPayment.amount_minor, at: lastPayment.created_at }
      : null,
  };
}
