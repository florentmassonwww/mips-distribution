// Club back office: members, charges, dues, reminders, member payments, bank reconciliation,
// accounting export and the entrance gate. Reserved to companies with the Club module.
import { z } from "zod";
import { all } from "../core/db.ts";
import { businessDay, iso } from "../core/time.ts";
import { accountingExport } from "../modules/club/accounting.ts";
import { assignBankLine, demoStatement as demoClubStatement, importStatement as importClubStatement, reconciliationOverview as clubReconciliation } from "../modules/club/bank-reconciliation.ts";
import { cancelCharge, chargeMember as addCharge } from "../modules/club/charges.ts";
import { clubDashboard } from "../modules/club/dashboard.ts";
import { duesOverview as listDues, runDues } from "../modules/club/dues.ts";
import { checkAtDesk as checkGateCredential, listGateEvents as gateEvents } from "../modules/club/gate.ts";
import { checkMemberPaymentStatus as checkMemberPayment, listMemberPayments as memberPayments, recordCashPayment } from "../modules/club/member-payments.ts";
import { createMember, listMembers, memberDetail, updateMember } from "../modules/club/members.ts";
import { listReminders, runReminders } from "../modules/club/reminders.ts";
import { sendStatement as memberStatement } from "../modules/club/statements.ts";
import { CLUB_OUTLETS } from "../modules/distribution/settings.ts";
import { type App, type AppDeps, companyOf, queryFilter, readJson, requestOrigin, routeParam } from "./context.ts";
import { csvResponse, wantsCsv, withDecimalAmounts } from "./csv.ts";

/** Client-chosen key making a payment request safe to retry. */
export const idempotencyKeySchema = z.string().min(16).max(80);
/** An e-mail address, or "" for none. */
const optionalEmailSchema = z.union([z.email().max(120), z.literal("")]);
const isoDaySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const memberInputSchema = z.object({
  name: z.string().min(2).max(80),
  email: optionalEmailSchema.default(""),
  phone: z.string().max(30).default(""),
  planId: z.string().nullable(),
  badge: z
    .string()
    .regex(/^[A-Za-z0-9-]{3,24}$/)
    .optional(),
});

export function registerClubRoutes(app: App, deps: AppDeps): void {
  const { db, config, connectors, session, now, syncErpIfAuto } = deps;
  const staff = session.requireModuleRole("club", "company_admin", "dispatcher", "finance");
  const secretariat = session.requireModuleRole("club", "company_admin", "dispatcher");
  const accounting = session.requireModuleRole("club", "company_admin", "finance");
  const frontDesk = session.requireModuleRole("club", "company_admin", "dispatcher", "agent");

  app.get("/api/club/dashboard", staff, (c) => c.json(clubDashboard(db, companyOf(c), now())));

  app.get("/api/club/members", staff, (c) => {
    const members = listMembers(db, companyOf(c), now(), {
      q: c.req.query("q"),
      filter: c.req.query("filter"),
      sort: c.req.query("sort"),
    });
    if (!wantsCsv(c)) return c.json(members);
    return csvResponse(c, "membres", withDecimalAmounts(members, "balance_minor", "overdue_minor"), [
      ["number", "Numéro"],
      ["name", "Nom"],
      ["plan", "Catégorie"],
      ["status", "État"],
      ["reference", "Référence de paiement"],
      ["balance_minor", "Solde dû"],
      ["overdue_minor", "Dont en retard"],
      ["overdue_days", "Jours de retard"],
      ["last_reminder_level", "Dernière relance (niveau)"],
      ["last_reminder_at", "Relancé le (UTC)"],
    ]);
  });

  app.post("/api/club/members", secretariat, async (c) =>
    c.json(createMember(db, c.get("user"), await readJson(c, memberInputSchema), now())),
  );

  app.get("/api/club/members/:id", staff, (c) => c.json(memberDetail(db, companyOf(c), routeParam(c), now())));

  app.patch("/api/club/members/:id", secretariat, async (c) => {
    const patch = await readJson(
      c,
      z.object({
        status: z.enum(["active", "suspended", "resigned"]).optional(),
        planId: z.string().nullable().optional(),
        email: optionalEmailSchema.optional(),
        phone: z.string().max(30).optional(),
      }),
    );
    updateMember(db, c.get("user"), routeParam(c), patch, now());
    return c.json({ ok: true });
  });

  app.post("/api/club/members/:id/charges", secretariat, async (c) => {
    const charge = await readJson(
      c,
      z.object({
        kind: z.enum(["consumption", "fee"]),
        outlet: z.enum(CLUB_OUTLETS),
        label: z.string().min(2).max(80),
        amountMinor: z.number().int().positive().max(1e8),
      }),
    );
    const result = addCharge(db, c.get("user"), routeParam(c), charge, now());
    await syncErpIfAuto(companyOf(c));
    return c.json(result);
  });

  app.post("/api/club/charges/:id/cancel", accounting, async (c) => {
    const { reason } = await readJson(c, z.object({ reason: z.string().min(3).max(200) }));
    cancelCharge(db, c.get("user"), routeParam(c), reason, now());
    await syncErpIfAuto(companyOf(c));
    return c.json({ ok: true });
  });

  app.post("/api/club/members/:id/cash", accounting, async (c) => {
    const cash = await readJson(
      c,
      z.object({
        amountMinor: z.number().int().positive().max(1e8),
        note: z.string().max(200).default(""),
        idempotencyKey: idempotencyKeySchema,
      }),
    );
    const { payment, replayed } = recordCashPayment(
      db,
      c.get("user"),
      routeParam(c),
      cash.amountMinor,
      cash.note,
      cash.idempotencyKey,
      now(),
    );
    await syncErpIfAuto(companyOf(c));
    return c.json({ id: payment.id, status: payment.status, replayed });
  });

  app.post("/api/club/members/:id/statement", staff, (c) =>
    c.json(memberStatement(db, c.get("user"), routeParam(c), requestOrigin(c), now())),
  );

  app.get("/api/club/dues", staff, (c) => c.json(listDues(db, companyOf(c))));

  app.post("/api/club/dues/run", accounting, async (c) => {
    const { period } = await readJson(c, z.object({ period: z.string().max(7) }));
    const result = runDues(db, c.get("user"), period, now());
    await syncErpIfAuto(companyOf(c));
    return c.json(result);
  });

  app.get("/api/club/reminders", staff, (c) => c.json(listReminders(db, companyOf(c))));

  app.post("/api/club/reminders/run", accounting, (c) => c.json(runReminders(db, c.get("user"), requestOrigin(c), now())));

  app.get("/api/club/payments", accounting, (c) => {
    const payments = memberPayments(db, companyOf(c), { status: queryFilter(c, "status"), method: queryFilter(c, "method") });
    if (!wantsCsv(c)) return c.json(payments);
    return csvResponse(c, "encaissements-membres", withDecimalAmounts(payments, "amount_minor", "fee_actual_minor"), [
      ["created_at", "Créé le (UTC)"],
      ["member_number", "Membre"],
      ["member", "Nom"],
      ["method", "Moyen"],
      ["amount_minor", "Montant"],
      ["status", "État"],
      ["confirmed_via", "Confirmé par"],
      ["confirmed_at", "Confirmé le (UTC)"],
      ["settlement_status", "Règlement bancaire"],
      ["fee_actual_minor", "Frais prélevés"],
      ["provider_ref", "Référence prestataire"],
      ["reference", "Référence membre"],
    ]);
  });

  app.post("/api/club/payments/:id/check", staff, async (c) => {
    const payment = await checkMemberPayment(db, connectors, c.get("user"), routeParam(c), now());
    await syncErpIfAuto(companyOf(c));
    return c.json({ id: payment.id, status: payment.status });
  });

  app.get("/api/club/reconciliation", accounting, (c) => c.json(clubReconciliation(db, companyOf(c))));

  if (config.demoMode) {
    app.get("/api/club/statements/demo", accounting, (c) =>
      c.json({ filename: `releve-club-demo-${businessDay(now())}.csv`, content: demoClubStatement(db, companyOf(c), now()) }),
    );
  }

  app.post("/api/club/statements", accounting, async (c) => {
    const upload = await readJson(c, z.object({ filename: z.string().min(1).max(120), content: z.string().min(10).max(2e6) }));
    const result = importClubStatement(db, connectors, c.get("user"), upload.filename, upload.content, now());
    await syncErpIfAuto(companyOf(c));
    return c.json(result);
  });

  // Manual matching of a bank line the reconciliation could not attribute.
  app.post("/api/club/bank-lines/:id/assign", accounting, async (c) => {
    const assignment = await readJson(c, z.object({ memberId: z.string(), note: z.string().min(3).max(200) }));
    const result = assignBankLine(db, c.get("user"), routeParam(c), assignment.memberId, assignment.note, now());
    await syncErpIfAuto(companyOf(c));
    return c.json(result);
  });

  // Accounting entries for a period (current month by default); invalid dates fall back to it.
  app.get("/api/club/accounting", accounting, (c) => {
    const today = businessDay(now());
    const from = isoDaySchema.safeParse(c.req.query("from")).data ?? `${today.slice(0, 7)}-01`;
    const to = isoDaySchema.safeParse(c.req.query("to")).data ?? today;
    const result = accountingExport(db, companyOf(c), from, to);
    if (!wantsCsv(c)) return c.json(result);
    return csvResponse(c, `export-comptable-${from}-${to}`, withDecimalAmounts(result.lines, "debit", "credit"), [
      ["date", "Date"],
      ["journal", "Journal"],
      ["account", "Compte"],
      ["aux", "Compte tiers"],
      ["piece", "Pièce"],
      ["label", "Libellé"],
      ["debit", "Débit"],
      ["credit", "Crédit"],
    ]);
  });

  // Manual check at the front desk (badge or member number typed in).
  app.post("/api/club/gate/check", frontDesk, async (c) => {
    const { credential } = await readJson(c, z.object({ credential: z.string().min(1).max(64) }));
    return c.json(checkGateCredential(db, c.get("user"), credential, now()));
  });

  // `?today=1`: only since midnight, Mauritius time.
  app.get("/api/club/gate/events", frontDesk, (c) =>
    c.json(
      gateEvents(
        db,
        companyOf(c),
        c.req.query("today") ? iso(new Date(`${businessDay(now())}T00:00:00+04:00`)) : undefined,
      ),
    ),
  );

  app.get("/api/club/gate/devices", session.requireModuleRole("club", "company_admin"), (c) =>
    c.json(all(db, "SELECT id, name, active, created_at FROM gate_devices WHERE company_id = ? ORDER BY created_at", companyOf(c))),
  );
}
