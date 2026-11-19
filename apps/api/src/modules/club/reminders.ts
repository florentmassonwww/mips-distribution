// Payment reminders: a run sends, to every member with an overdue amount above the threshold,
// the reminder of the level reached by the age of the debt. One reminder per member, per cycle
// (the oldest overdue charge) and per level: running the engine twice sends nothing new.
import type { Actor } from "../../core/actor.ts";
import { recordAudit } from "../../core/audit.ts";
import { type Db, all, get, run, transaction } from "../../core/db.ts";
import { formatMinor } from "../../core/format.ts";
import { newId } from "../../core/ids.ts";
import { businessDay, iso } from "../../core/time.ts";
import { type MemberAccount, memberAccount } from "./allocation.ts";
import { loadSettings } from "./legacy-deps.ts";
import { actorCompanyId, portalPath } from "./shared.ts";
import type { MemberRow } from "./types.ts";

/** Subject per level; level 0 is a statement sent on request, not a reminder. */
const SUBJECTS: Record<number, string> = {
  0: "Votre relevé de compte",
  1: "Rappel : un montant reste dû sur votre compte",
  2: "Second rappel : votre compte présente un retard",
  3: "Dernier rappel : votre retard sera signalé à l'entrée du club",
};

/** Text of a reminder or statement (email or SMS). */
export function reminderMessage(
  member: MemberRow,
  clubName: string,
  level: number,
  account: MemberAccount,
  payUrl: string,
): string {
  const overdue = account.overdueMinor
    ? `, dont ${formatMinor(account.overdueMinor)} MUR en retard de ${account.overdueDays} jour(s)`
    : "";
  return `${SUBJECTS[level]} - ${clubName}. Membre ${member.number} : ${formatMinor(account.dueMinor)} MUR dû${overdue}. Payer en ligne : ${payUrl}. Par virement, indiquez la référence ${member.reference}.`;
}

/** Channel of a member's messages: email when known, SMS otherwise. */
export const reminderChannel = (member: MemberRow): "email" | "sms" => (member.email ? "email" : "sms");

export const companyName = (db: Db, companyId: string): string =>
  get<{ name: string }>(db, "SELECT name FROM companies WHERE id = ?", companyId)!.name;

export interface ReminderRunResult {
  sent: number;
  alreadySent: number;
  byLevel: Record<number, number>;
}

/** Sends the reminders due today. `origin` is the base URL of the members' public pages. */
export function runReminders(db: Db, actor: Actor, origin: string, now: Date = new Date()): ReminderRunResult {
  const companyId = actorCompanyId(actor);
  const club = loadSettings(db, companyId).club;
  const clubName = companyName(db, companyId);
  const day = businessDay(now);
  return transaction(db, () => {
    const result: ReminderRunResult = { sent: 0, alreadySent: 0, byLevel: { 1: 0, 2: 0, 3: 0 } };
    const members = all<MemberRow>(db, "SELECT * FROM members WHERE company_id = ? ORDER BY number", companyId);
    for (const member of members) {
      const account = memberAccount(db, member.id, day);
      if (!account.oldestOverdueId || account.overdueMinor < club.reminders.minAmountMinor) continue;
      // Level = number of thresholds (in days overdue) reached.
      const level = club.reminders.levels.filter((days) => account.overdueDays >= days).length;
      if (!level) continue;
      const alreadySent = get(
        db,
        "SELECT 1 FROM member_reminders WHERE company_id = ? AND member_id = ? AND cycle = ? AND level = ?",
        companyId,
        member.id,
        account.oldestOverdueId,
        level,
      );
      if (alreadySent) {
        result.alreadySent++;
        continue;
      }
      run(
        db,
        "INSERT INTO member_reminders (id, company_id, member_id, cycle, level, channel, amount_minor, overdue_days, message, sent_by, sent_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        newId("rem"),
        companyId,
        member.id,
        account.oldestOverdueId,
        level,
        reminderChannel(member),
        account.dueMinor,
        account.overdueDays,
        reminderMessage(member, clubName, level, account, `${origin}${portalPath(member)}`),
        actor.id,
        iso(now),
      );
      result.sent++;
      result.byLevel[level] = (result.byLevel[level] ?? 0) + 1;
    }
    recordAudit(
      db,
      actor,
      "reminders.run",
      "reminders",
      // The run as a whole has no entity id.
      null as unknown as string,
      {
        sent: result.sent,
        alreadySent: result.alreadySent,
        level1: result.byLevel[1],
        level2: result.byLevel[2],
        level3: result.byLevel[3],
      },
      companyId,
      now,
    );
    return result;
  });
}

/** Latest 400 reminders and statements sent by a club. */
export const listReminders = (db: Db, companyId: string): unknown[] =>
  all(
    db,
    `SELECT r.id, r.level, r.channel, r.amount_minor, r.overdue_days, r.message, r.sent_at, m.id AS member_id, m.number AS member_number, m.name AS member, u.name AS sent_by
    FROM member_reminders r JOIN members m ON m.id = r.member_id LEFT JOIN users u ON u.id = r.sent_by WHERE r.company_id = ? ORDER BY r.sent_at DESC, r.rowid DESC LIMIT 400`,
    companyId,
  );
