// Account statement sent to a member on request (from the member's page in the back office).
import type { Actor } from "../../core/actor.ts";
import { recordAudit } from "../../core/audit.ts";
import { type Db, run, transaction } from "../../core/db.ts";
import { newId } from "../../core/ids.ts";
import { businessDay, iso } from "../../core/time.ts";
import { memberAccount } from "./allocation.ts";
import { companyName, reminderChannel, reminderMessage } from "./reminders.ts";
import { actorCompanyId, portalPath, requireMember } from "./shared.ts";

/** Sends the statement (level 0 message) and returns the member's page URL and the text sent. */
export function sendStatement(
  db: Db,
  actor: Actor,
  memberId: string,
  origin: string,
  now: Date = new Date(),
): { url: string; message: string } {
  const companyId = actorCompanyId(actor);
  return transaction(db, () => {
    const member = requireMember(db, companyId, memberId);
    const account = memberAccount(db, member.id, businessDay(now));
    const url = `${origin}${portalPath(member)}`;
    const message = reminderMessage(member, companyName(db, companyId), 0, account, url);
    // Random draws: the reminder id first, then the id of its own cycle (a statement never
    // blocks a later reminder).
    const id = newId("rem");
    const cycle = `manuel:${newId("c")}`;
    run(
      db,
      "INSERT INTO member_reminders (id, company_id, member_id, cycle, level, channel, amount_minor, overdue_days, message, sent_by, sent_at) VALUES (?,?,?,?,0,?,?,?,?,?,?)",
      id,
      companyId,
      member.id,
      cycle,
      reminderChannel(member),
      account.dueMinor,
      account.overdueDays,
      message,
      actor.id,
      iso(now),
    );
    recordAudit(
      db,
      actor,
      "member.statement_sent",
      "member",
      member.id,
      { number: member.number, dueMinor: account.dueMinor },
      companyId,
      now,
    );
    return { url, message };
  });
}
