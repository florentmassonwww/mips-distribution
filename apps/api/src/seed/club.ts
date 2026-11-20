// Demo sports club "Club Sportif Démo": plans, members, two years of dues, cash and online
// payments, bank statements, consumptions, reminders and gate passages.
//
// The calls below go through the business functions and the simulated payment provider, in a
// fixed order: that order determines every generated identifier and token, so it must not change.
import { type Db, all, get, run, transaction } from "../core/db.ts";
import { type Actor, SYSTEM_ACTOR } from "../core/actor.ts";
import { setCompanyModules } from "../core/modules.ts";
import { formatMinor } from "../core/format.ts";
import { addDays, businessDay, iso } from "../core/time.ts";
import { importStatement as importClubStatement } from "../modules/club/bank-reconciliation.ts";
import { chargeMember as addCharge } from "../modules/club/charges.ts";
import { runDues } from "../modules/club/dues.ts";
import { readerDecision as recordGatePassage } from "../modules/club/gate.ts";
import { recordCashPayment, startLinkPayment as startMemberLinkPayment } from "../modules/club/member-payments.ts";
import { createMember, updateMember } from "../modules/club/members.ts";
import { runReminders } from "../modules/club/reminders.ts";
import { type DemoConnectorSet as Connectors } from "../modules/connectors/types.ts";
import { defaultCompanySettings as defaultSettings } from "../modules/distribution/settings.ts";
import { syncAccountingEntries as syncErp } from "../modules/finance/index.ts";
import { processNotification as handleNotification } from "../modules/payments/index.ts";
import {
  CLUB_COMPANY_ID,
  CLUB_CONSUMPTIONS,
  CLUB_MEMBERS,
  CLUB_PLANS,
  SEED_ORIGIN,
  planFeeMinor,
  type UserSpec,
} from "./catalog.ts";
import { providerRef, seedActor } from "./companies.ts";

const GATE_DEVICE_ID = "gd_cs_main";
const CASH_NOTE = "Espèces remises au secrétariat";
const STATEMENT_HEADER = "date;reference;libelle;montant_brut;frais;montant_net";

const CLUB_USERS: readonly UserSpec[] = [
  ["admin", "Véronique B. (démo)", "company_admin"],
  ["secretariat", "Arvind K. (démo)", "dispatcher"],
  ["compta", "Mélanie C. (démo)", "finance"],
  ["accueil", "Jean-Luc P. (démo)", "agent"],
];

interface MemberRow {
  id: string;
  number: string;
  reference: string;
  badge: string;
}

/** [member index, amount in minor units] of a bank transfer paying dues. */
type Transfer = readonly [memberIndex: number, amountMinor: number];

export async function seedClub(db: Db, connectors: Connectors, now: Date = new Date()): Promise<void> {
  const settings = defaultSettings();
  settings.club.refPrefix = "CSD";
  insertClubCompany(db, JSON.stringify(settings), now);

  const secretariat = seedActor(db, "u_cs_secretariat");
  const accounting = seedActor(db, "u_cs_compta");
  const daysAgo = (days: number): Date => addDays(now, -days);

  const memberIds = CLUB_MEMBERS.map(
    ([name, planCode, hasEmail], index) =>
      createMember(
        db,
        secretariat,
        {
          name,
          email: hasEmail ? `${name.split(" ")[0]!.toLowerCase()}.${index + 1}@membres.exemple.invalid` : "",
          phone: `+230 5900 ${String(1100 + index)}`,
          planId: `plan_cs_${planCode.toLowerCase()}`,
        },
        daysAgo(700),
      ).id,
  );
  const member = (index: number): MemberRow =>
    get<MemberRow>(db, "SELECT * FROM members WHERE id = ?", memberIds[index]!)!;

  /** The member pays online through the portal link, and the simulated provider confirms it. */
  const payOnline = async (index: number, at: Date): Promise<void> => {
    const { id, number } = member(index);
    const memberActor: Actor = { id: `member:${number}`, role: "member", companyId: CLUB_COMPANY_ID };
    const started = await startMemberLinkPayment(
      db,
      connectors,
      CLUB_COMPANY_ID,
      id,
      `seed-link-${number}-${at.getTime()}`,
      SEED_ORIGIN,
      memberActor,
      at,
    );
    const notification = connectors.payments.link.simulate(providerRef(started.payment), "success", at)!;
    handleNotification(db, connectors, "link", notification.rawBody, notification.signature, at);
  };

  /**
   * Imports a bank statement holding the settlement of every unsettled online payment (net of the
   * provider fee) plus the given dues transfers. Nothing is imported when it would be empty.
   */
  const importStatement = (at: Date, transfers: readonly Transfer[]): void => {
    const day = businessDay(at);
    const feeBps = settings.payments.methods.link.feeBps;
    const lines = all<{ provider_ref: string; amount_minor: number }>(
      db,
      "SELECT provider_ref, amount_minor FROM member_payments WHERE company_id = ? AND method = 'link' AND status = 'confirmed' AND settlement_status = 'unsettled'",
      CLUB_COMPANY_ID,
    ).map(({ provider_ref, amount_minor }) => {
      const fee = feeBps === null ? 0 : Math.round((amount_minor * feeBps) / 1e4);
      return `${day};${provider_ref};REGLEMENT PAIEMENTS EN LIGNE;${formatMinor(amount_minor)};${formatMinor(fee)};${formatMinor(amount_minor - fee)}`;
    });
    transfers.forEach(([memberIndex, amount], index) =>
      lines.push(
        `${day};VIR-${day.replace(/-/g, "")}-${String(index + 1).padStart(2, "0")};VIREMENT ${member(memberIndex).reference} COTISATION;${formatMinor(amount)};0.00;${formatMinor(amount)}`,
      ),
    );
    if (lines.length) {
      importClubStatement(db, connectors, accounting, `releve-club-${day}.csv`, `${STATEMENT_HEADER}\n${lines.join("\n")}\n`, at);
    }
  };

  // Previous year: dues run, most members paid by transfer, two juniors in cash; one suspension.
  const previousYear = daysAgo(645);
  runDues(db, accounting, String(previousYear.getUTCFullYear()), previousYear);
  importStatement(
    addDays(previousYear, 20),
    [0, 1, 2, 4, 5, 6, 10, 11, 14].map((index): Transfer => [index, planFeeMinor(CLUB_MEMBERS[index]![1])]),
  );
  recordCashPayment(db, accounting, memberIds[3]!, planFeeMinor("JUN"), CASH_NOTE, "seed-cash-prev-4", addDays(previousYear, 12));
  recordCashPayment(db, accounting, memberIds[12]!, planFeeMinor("JUN"), CASH_NOTE, "seed-cash-prev-13", addDays(previousYear, 12));
  updateMember(db, seedActor(db, "u_cs_admin"), memberIds[13]!, { status: "suspended" }, daysAgo(420));

  // Current year: fewer members have paid (one only half), one online payment, one resignation.
  const currentYear = daysAgo(280);
  runDues(db, accounting, String(currentYear.getUTCFullYear()), currentYear);
  recordCashPayment(db, accounting, memberIds[3]!, planFeeMinor("JUN"), CASH_NOTE, "seed-cash-cur-4", addDays(currentYear, 10));
  importStatement(addDays(currentYear, 25), [
    [0, planFeeMinor("IND")],
    [1, planFeeMinor("FAM")],
    [4, planFeeMinor("SEN")],
    [6, planFeeMinor("FAM")],
    [10, planFeeMinor("IND")],
    [5, planFeeMinor("IND") / 2],
  ]);
  await payOnline(2, addDays(currentYear, 40));
  importStatement(addDays(currentYear, 45), []);
  updateMember(db, seedActor(db, "u_cs_admin"), memberIds[14]!, { status: "resigned" }, daysAgo(100));

  // Monthly members: dues on the 5th of each of the last four months (never in the future).
  const monthOf = (date: Date): string => businessDay(date).slice(0, 7);
  for (const monthsAgo of [3, 2, 1, 0]) {
    const fifth = new Date(now);
    fifth.setUTCDate(1);
    fifth.setUTCMonth(fifth.getUTCMonth() - monthsAgo);
    fifth.setUTCDate(5);
    fifth.setUTCHours(6);
    const runAt = fifth > now ? now : fifth;
    runDues(db, accounting, monthOf(runAt), runAt);
    if (monthsAgo > 0) await payOnline(8, addDays(runAt, 3));
    if (monthsAgo === 3) await payOnline(9, addDays(runAt, 4));
  }

  // A recent member (index 15).
  memberIds.push(
    createMember(
      db,
      secretariat,
      { name: "Rohan Bhugaloo (démo)", email: "rohan.16@membres.exemple.invalid", phone: "+230 5900 1115", planId: "plan_cs_ind" },
      daysAgo(20),
    ).id,
  );

  // Consumptions spread over the last 75 days; the last three go to the recent member.
  const regulars = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  for (let index = 0; index < 24; index++) {
    const [outlet, label, baseRupees] = CLUB_CONSUMPTIONS[index % CLUB_CONSUMPTIONS.length]!;
    const memberIndex = index >= 21 ? 15 : regulars[(index * 5) % regulars.length]!;
    addCharge(
      db,
      secretariat,
      memberIds[memberIndex]!,
      { kind: "consumption", outlet, label, amountMinor: (baseRupees + (index % 3) * 50) * 100 },
      daysAgo(75 - index * 3),
    );
  }

  for (const index of [0, 1, 4]) await payOnline(index, daysAgo(40));
  importStatement(daysAgo(35), [[11, planFeeMinor("FAM")]]);
  for (const index of [6, 10]) await payOnline(index, daysAgo(10));
  runReminders(db, accounting, SEED_ORIGIN, daysAgo(30));
  runReminders(db, accounting, SEED_ORIGIN, daysAgo(8));

  // This morning at the gate, plus an unknown badge.
  const hoursAgo = (hours: number): Date => new Date(now.getTime() - hours * 36e5);
  for (const [index, hours] of [[0, 4], [10, 3.5], [7, 3], [1, 2.5], [13, 2], [9, 1.5]] as const) {
    recordGatePassage(db, CLUB_COMPANY_ID, GATE_DEVICE_ID, member(index).badge, hoursAgo(hours));
  }
  recordGatePassage(db, CLUB_COMPANY_ID, GATE_DEVICE_ID, "B99999", hoursAgo(1));
  await syncErp(db, connectors, CLUB_COMPANY_ID, {}, undefined, now);
}

/** Club company (Club module, no site), staff accounts, membership plans and the gate reader. */
function insertClubCompany(db: Db, settingsJson: string, now: Date): void {
  transaction(db, () => {
    run(
      db,
      "INSERT INTO companies (id, name, slug, plan, subscription_status, subscription_renews_at, settings_json, created_at) VALUES (?,?,?,?,?,?,?,?)",
      CLUB_COMPANY_ID,
      "Club Sportif Démo",
      "cs",
      "pilote",
      "essai",
      iso(addDays(now, 30)),
      settingsJson,
      iso(addDays(now, -700)),
    );
    setCompanyModules(db, CLUB_COMPANY_ID, ["club"], SYSTEM_ACTOR.id, addDays(now, -700));
    for (const [key, name, role] of CLUB_USERS) {
      run(
        db,
        "INSERT INTO users (id, company_id, name, email, role, created_at) VALUES (?,?,?,?,?,?)",
        `u_cs_${key}`,
        CLUB_COMPANY_ID,
        name,
        `${key}@cs.exemple.invalid`,
        role,
        iso(now),
      );
    }
    for (const [code, name, billing, feeRupees] of CLUB_PLANS) {
      run(
        db,
        "INSERT INTO club_plans (id, company_id, code, name, billing, fee_minor) VALUES (?,?,?,?,?,?)",
        `plan_cs_${code.toLowerCase()}`,
        CLUB_COMPANY_ID,
        code,
        name,
        billing,
        feeRupees * 100,
      );
    }
    run(
      db,
      "INSERT INTO gate_devices (id, company_id, name, created_at) VALUES (?,?,?,?)",
      GATE_DEVICE_ID,
      CLUB_COMPANY_ID,
      "Barrière entrée principale (démo)",
      iso(now),
    );
  });
}
