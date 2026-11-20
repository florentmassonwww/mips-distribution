// Finance (distribution): transaction journal, invoices, refunds, bank reconciliation, daily
// close and ERP entries. Most lists can be exported as CSV.
import { z } from "zod";
import { formatMinor } from "../core/format.ts";
import { businessDay } from "../core/time.ts";
import { FINANCE_ROLES, readCompanySettings as companySettings } from "../modules/distribution/settings.ts";
import { closeDay, generateDemoStatement as demoBankStatement, getDayTotals as closePreview, getReconciliation as reconciliation, importStatement as importBankStatement, listAccountingEntries as erpEntries, listDailyCloses as dailyCloses, listInvoices as invoiceList, listJournal as paymentJournal, syncAccountingEntries as syncErp } from "../modules/finance/index.ts";
import { refundPayment } from "../modules/payments/index.ts";
import { serializePayment as presentPayment } from "../modules/payments/payment-view.ts";
import { type App, type AppDeps, companyOf, queryFilter, readJson, routeParam } from "./context.ts";
import { csvResponse, wantsCsv, withDecimalAmounts } from "./csv.ts";

export function registerFinanceRoutes(app: App, deps: AppDeps): void {
  const { db, config, connectors, session, now, syncErpIfAuto } = deps;
  const financeOnly = session.requireRole(...FINANCE_ROLES);

  app.get("/api/finance/journal", financeOnly, (c) => {
    const rows = paymentJournal(db, companyOf(c), {
      status: queryFilter(c, "status"),
      method: queryFilter(c, "method"),
      day: queryFilter(c, "day"),
      settlement: queryFilter(c, "settlement"),
    });
    if (!wantsCsv(c)) return c.json(rows);
    return csvResponse(
      c,
      "journal-transactions",
      withDecimalAmounts(rows, "amount_minor", "refunded_minor", "fee_expected_minor", "fee_actual_minor"),
      [
        ["created_at", "Créé le (UTC)"],
        ["company", "Entreprise"],
        ["invoice", "Facture"],
        ["order_number", "Commande"],
        ["customer_outlet", "Commerce"],
        ["agent", "Agent"],
        ["method", "Moyen"],
        ["amount_minor", "Montant"],
        ["currency", "Devise"],
        ["status", "État du paiement"],
        ["provider_ref", "Référence prestataire"],
        ["confirmed_at", "Confirmé le (UTC)"],
        ["confirmed_via", "Confirmé par"],
        ["refunded_minor", "Remboursé"],
        ["settlement_status", "Règlement bancaire"],
        ["settled_at", "Réglé le (UTC)"],
        ["fee_expected_minor", "Frais attendus"],
        ["fee_actual_minor", "Frais prélevés"],
        ["failure_reason", "Motif d'échec"],
        ["verify_reason", "Motif de vérification"],
      ],
    );
  });

  app.get("/api/finance/invoices", financeOnly, (c) => {
    const rows = invoiceList(db, companyOf(c));
    if (!wantsCsv(c)) return c.json(rows);
    return csvResponse(c, "factures", withDecimalAmounts(rows, "amount_minor", "paid_minor", "refunded_minor", "settled_minor"), [
      ["number", "Facture"],
      ["issued_at", "Émise le (UTC)"],
      ["order_number", "Commande"],
      ["customer_outlet", "Commerce"],
      ["route", "Tournée"],
      ["agent", "Agent"],
      ["amount_minor", "Montant"],
      ["paid_minor", "Encaissé confirmé"],
      ["refunded_minor", "Remboursé"],
      ["settled_minor", "Réglé en banque"],
      ["status", "État"],
      ["erp_status", "ERP"],
    ]);
  });

  app.post("/api/finance/payments/:id/refund", financeOnly, async (c) => {
    const refund = await readJson(c, z.object({ amountMinor: z.number().int().positive(), reason: z.string().min(3).max(200) }));
    const payment = await refundPayment(db, connectors, c.get("user"), routeParam(c), refund.amountMinor, refund.reason, now());
    await syncErpIfAuto(payment.company_id);
    return c.json(presentPayment(payment));
  });

  app.get("/api/finance/reconciliation", financeOnly, (c) => {
    const result = reconciliation(db, companyOf(c));
    if (!wantsCsv(c)) return c.json(result);
    return csvResponse(c, "rapprochement", withDecimalAmounts(result.lines, "gross_minor", "fee_minor", "net_minor", "fee_expected_minor"), [
      ["value_date", "Date de valeur"],
      ["reference", "Référence"],
      ["label", "Libellé"],
      ["gross_minor", "Brut"],
      ["fee_minor", "Frais"],
      ["net_minor", "Net"],
      ["match_status", "Rapprochement"],
      ["invoice", "Facture"],
      ["method", "Moyen"],
      ["fee_expected_minor", "Frais attendus"],
    ]);
  });

  if (config.demoMode) {
    // A statement the simulated bank would send for the company's activity (optionally with anomalies).
    app.get("/api/finance/statements/demo", financeOnly, (c) =>
      c.json({
        filename: `releve-demo-${businessDay(now())}.csv`,
        content: demoBankStatement(db, companyOf(c), c.req.query("anomalies") === "1", now()),
      }),
    );
  }

  app.post("/api/finance/statements", financeOnly, async (c) => {
    const upload = await readJson(c, z.object({ filename: z.string().min(1).max(120), content: z.string().min(10).max(2e6) }));
    const result = importBankStatement(db, connectors, c.get("user"), upload.filename, upload.content, now());
    await syncErpIfAuto(companyOf(c));
    return c.json(result);
  });

  app.get("/api/finance/close", financeOnly, (c) => {
    const closes = dailyCloses(db, companyOf(c));
    if (wantsCsv(c)) {
      const rows = closes.map((close) => ({
        day: close.day,
        closed_at: close.closed_at,
        closed_by: close.closed_by,
        invoiced: formatMinor(close.totals.invoiced),
        outstanding: formatMinor(close.totals.outstanding),
        to_verify: close.totals.toVerify,
        exceptions: close.totals.openExceptions,
      }));
      return csvResponse(c, "clotures", rows, [
        ["day", "Journée"],
        ["closed_at", "Clôturée le (UTC)"],
        ["closed_by", "Par"],
        ["invoiced", "Facturé"],
        ["outstanding", "Reste à encaisser"],
        ["to_verify", "Paiements à vérifier"],
        ["exceptions", "Exceptions ouvertes"],
      ]);
    }
    return c.json({ preview: closePreview(db, companyOf(c), c.req.query("day") || businessDay(now())), closes });
  });

  app.post("/api/finance/close", financeOnly, async (c) =>
    c.json(closeDay(db, c.get("user"), (await readJson(c, z.object({ day: z.string() }))).day, now())),
  );

  app.get("/api/finance/erp", financeOnly, (c) => {
    const entries = erpEntries(db, companyOf(c));
    if (wantsCsv(c)) {
      return csvResponse(c, "ecritures-erp", withDecimalAmounts(entries, "amount_minor"), [
        ["created_at", "Créée le (UTC)"],
        ["kind", "Type"],
        ["label", "Libellé"],
        ["amount_minor", "Montant"],
        ["status", "État"],
        ["attempts", "Tentatives"],
        ["last_error", "Dernière erreur"],
        ["external_ref", "Référence ERP"],
        ["synced_at", "Synchronisée le (UTC)"],
      ]);
    }
    return c.json({
      entries,
      settings: {
        system: companySettings(db, companyOf(c)).erp.system,
        autoSync: companySettings(db, companyOf(c)).erp.autoSync,
        simulateFailure: companySettings(db, companyOf(c)).erp.simulateFailure,
      },
    });
  });

  // Manual push; failed entries are retried too.
  app.post("/api/finance/erp/sync", financeOnly, async (c) => {
    const { ids } = await readJson(c, z.object({ ids: z.array(z.string()).max(200).optional() }));
    return c.json(await syncErp(db, connectors, companyOf(c), { ids, retryFailed: true }, c.get("user"), now()));
  });
}
