// Charges on member accounts: dues, consumptions at the club's outlets, fees; and cancellations.
import { z } from "zod";
import type { Actor } from "../../core/actor.ts";
import { recordAudit } from "../../core/audit.ts";
import { type Db, get, run, transaction } from "../../core/db.ts";
import { ApiError, notFound } from "../../core/errors.ts";
import { newId } from "../../core/ids.ts";
import { businessDay, iso } from "../../core/time.ts";
import { chargeJournalLines } from "./accounting.ts";
import { reallocatePayments } from "./allocation.ts";
import { addDaysToDay } from "./dates.ts";
import { OUTLETS, loadSettings, nextNumber, queueErpEntry } from "./legacy-deps.ts";
import { actorCompanyId, memberById, requireMember } from "./shared.ts";
import type { ChargeKind, MemberChargeRow, MemberRow } from "./types.ts";

export const chargeMemberInput = z.object({
  kind: z.enum(["consumption", "fee"]),
  outlet: z.enum(OUTLETS as [string, ...string[]]),
  label: z.string().min(2).max(80),
  amountMinor: z.number().int().positive().max(1e8),
});
export type ChargeMemberInput = z.infer<typeof chargeMemberInput>;

export const cancelChargeInput = z.object({ reason: z.string().min(3).max(200) });

export interface NewCharge {
  kind: ChargeKind;
  outlet: string;
  label: string;
  period: string | null;
  amountMinor: number;
  dueDate: string;
}

/** Inserts a charge, queues its ERP entry and reallocates the member's payments. Returns its id. */
export function createCharge(db: Db, actor: Actor, member: MemberRow, charge: NewCharge, now: Date): string {
  const id = newId("chg");
  const number = nextNumber(db, member.company_id, "member_charge", "MC");
  run(
    db,
    "INSERT INTO member_charges (id, company_id, member_id, number, kind, outlet, label, period, amount_minor, due_date, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
    id,
    member.company_id,
    member.id,
    number,
    charge.kind,
    charge.outlet,
    charge.label,
    charge.period,
    charge.amountMinor,
    charge.dueDate,
    actor.id,
    iso(now),
  );
  const row = get<MemberChargeRow>(db, "SELECT * FROM member_charges WHERE id = ?", id)!;
  const club = loadSettings(db, member.company_id).club;
  queueErpEntry(
    db,
    member.company_id,
    "member_charge",
    id,
    `${charge.label} - ${member.name}`,
    charge.amountMinor,
    {
      member: member.number,
      number,
      kind: charge.kind,
      outlet: charge.outlet,
      lines: chargeJournalLines(club, row, member),
    },
    now,
  );
  reallocatePayments(db, member.id);
  return id;
}

/** Records a consumption or a fee on an active member's account, due after the club's payment term. */
export function chargeMember(
  db: Db,
  actor: Actor,
  memberId: string,
  input: ChargeMemberInput,
  now: Date = new Date(),
): { id: string } {
  const companyId = actorCompanyId(actor);
  return transaction(db, () => {
    const member = requireMember(db, companyId, memberId);
    if (member.status !== "active") {
      throw new ApiError(
        409,
        "member_inactive",
        "Ce membre n'est pas actif : aucune consommation ne peut être imputée à son compte.",
      );
    }
    const dueDate = addDaysToDay(businessDay(now), loadSettings(db, companyId).club.dueDays);
    const id = createCharge(
      db,
      actor,
      member,
      {
        kind: input.kind,
        outlet: input.outlet,
        label: input.label.trim(),
        period: null,
        amountMinor: input.amountMinor,
        dueDate,
      },
      now,
    );
    recordAudit(
      db,
      actor,
      "member.charged",
      "member_charge",
      id,
      { member: member.number, kind: input.kind, outlet: input.outlet, amountMinor: input.amountMinor },
      companyId,
      now,
    );
    return { id };
  });
}

/** Cancels a charge: reversing ERP entry, payments reallocated to the remaining charges. */
export function cancelCharge(db: Db, actor: Actor, chargeId: string, reason: string, now: Date = new Date()): void {
  const companyId = actorCompanyId(actor);
  transaction(db, () => {
    const charge = get<MemberChargeRow>(db, "SELECT * FROM member_charges WHERE id = ? AND company_id = ?", chargeId, companyId);
    if (!charge) throw notFound("Dû");
    if (charge.status === "cancelled") throw new ApiError(409, "bad_status", "Ce dû est déjà annulé.");
    run(
      db,
      "UPDATE member_charges SET status = 'cancelled', allocated_minor = 0, cancel_reason = ?, cancelled_at = ? WHERE id = ?",
      reason,
      iso(now),
      charge.id,
    );
    const member = memberById(db, charge.member_id);
    const cancelled = get<MemberChargeRow>(db, "SELECT * FROM member_charges WHERE id = ?", charge.id)!;
    queueErpEntry(
      db,
      companyId,
      "member_charge",
      `${charge.id}:annulation`,
      `Annulation ${charge.label} - ${member.name}`,
      -charge.amount_minor,
      {
        member: member.number,
        number: charge.number,
        reason,
        lines: chargeJournalLines(loadSettings(db, companyId).club, cancelled, member, true),
      },
      now,
    );
    reallocatePayments(db, charge.member_id);
    recordAudit(
      db,
      actor,
      "member_charge.cancelled",
      "member_charge",
      charge.id,
      { member: member.number, number: charge.number, amountMinor: charge.amount_minor, reason },
      companyId,
      now,
    );
  });
}
