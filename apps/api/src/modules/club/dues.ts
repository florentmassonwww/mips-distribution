// Membership plans and dues runs: one dues charge per active member and period (year or month,
// depending on the plan's billing). Running a period twice bills nothing new.
import { z } from "zod";
import type { Actor } from "../../core/actor.ts";
import { recordAudit } from "../../core/audit.ts";
import { type Db, all, get, transaction } from "../../core/db.ts";
import { ApiError } from "../../core/errors.ts";
import { businessDay } from "../../core/time.ts";
import { createCharge } from "./charges.ts";
import { addDaysToDay } from "./dates.ts";
import { loadSettings } from "./legacy-deps.ts";
import { actorCompanyId } from "./shared.ts";
import type { MemberRow } from "./types.ts";

export const runDuesInput = z.object({ period: z.string().max(7) });

/** `YYYY` (annual plans) or `YYYY-MM` (monthly plans). */
export const isValidPeriod = (period: string): boolean => /^\d{4}(-(0[1-9]|1[0-2]))?$/.test(period);

export interface DuesRunResult {
  created: number;
  skipped: number;
  amountMinor: number;
}

interface BillableMemberRow extends MemberRow {
  plan_name: string;
  fee_minor: number;
}

/** Bills the dues of a period to every active member of an active plan with that billing. */
export function runDues(db: Db, actor: Actor, period: string, now: Date = new Date()): DuesRunResult {
  const companyId = actorCompanyId(actor);
  if (!isValidPeriod(period)) throw new ApiError(400, "invalid_input", "Période invalide (AAAA ou AAAA-MM).");
  const billing = period.length === 4 ? "annual" : "monthly";
  return transaction(db, () => {
    const dueDate = addDaysToDay(businessDay(now), loadSettings(db, companyId).club.dueDays);
    const result: DuesRunResult = { created: 0, skipped: 0, amountMinor: 0 };
    const members = all<BillableMemberRow>(
      db,
      `SELECT m.*, p.name AS plan_name, p.fee_minor FROM members m JOIN club_plans p ON p.id = m.plan_id
      WHERE m.company_id = ? AND m.status = 'active' AND p.billing = ? AND p.active = 1 ORDER BY m.number`,
      companyId,
      billing,
    );
    for (const member of members) {
      const alreadyBilled = get(
        db,
        "SELECT 1 FROM member_charges WHERE company_id = ? AND member_id = ? AND kind = 'dues' AND period = ? AND status != 'cancelled'",
        companyId,
        member.id,
        period,
      );
      if (alreadyBilled) {
        result.skipped++;
        continue;
      }
      createCharge(
        db,
        actor,
        member,
        {
          kind: "dues",
          outlet: "",
          label: `Cotisation ${period} - ${member.plan_name}`,
          period,
          amountMinor: member.fee_minor,
          dueDate,
        },
        now,
      );
      result.created++;
      result.amountMinor += member.fee_minor;
    }
    recordAudit(db, actor, "dues.billed", "dues", period, { period, ...result }, companyId, now);
    return result;
  });
}

/** Plans with their active member counts, and the dues billed per period (latest 36). */
export function duesOverview(db: Db, companyId: string): { plans: unknown[]; periods: unknown[] } {
  return {
    plans: all(
      db,
      `SELECT p.id, p.code, p.name, p.billing, p.fee_minor, p.active, (SELECT COUNT(*) FROM members m WHERE m.plan_id = p.id AND m.status = 'active') AS members
      FROM club_plans p WHERE p.company_id = ? ORDER BY p.billing, p.fee_minor DESC`,
      companyId,
    ),
    periods: all(
      db,
      `SELECT period, COUNT(*) AS count, SUM(amount_minor) AS amount_minor, SUM(allocated_minor) AS collected_minor, MIN(created_at) AS billed_at
      FROM member_charges WHERE company_id = ? AND kind = 'dues' AND status != 'cancelled' GROUP BY period ORDER BY period DESC LIMIT 36`,
      companyId,
    ),
  };
}
