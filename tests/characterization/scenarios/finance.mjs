// Finance: journal, invoices, refunds, bank statement import, reconciliation, exceptions,
// daily close and accounting-software entries with retry on error.
import { deliverFirstOrder, createPayment, simulate, TODAY } from "./helpers.mjs";

async function confirmedPayment(api, method = "paystation", key = "key-finance-pay-001") {
  await api.login("u_bd_agent1");
  const ctx = await deliverFirstOrder(api);
  const p = await createPayment(api, ctx.invoice, method, key);
  await simulate(api, p.data.payment.id, "success");
  return { ...ctx, payment: p.data.payment };
}

export const finance = [
  {
    name: "finance-journal-and-invoices",
    description: "Journal (with filters and CSV export) and invoice list, including seeded history.",
    async run(api) {
      await confirmedPayment(api);
      await api.login("u_bd_finance");
      await api.get("/api/finance/journal");
      await api.get("/api/finance/journal?status=confirmed&method=paystation", { label: "journal filtered" });
      await api.get(`/api/finance/journal?day=${TODAY}`, { label: "journal of the day" });
      await api.get("/api/finance/journal?settlement=unsettled", { label: "journal unsettled" });
      await api.get("/api/finance/journal?format=csv", { label: "journal CSV" });
      await api.get("/api/finance/invoices");
      await api.get("/api/finance/invoices?format=csv", { label: "invoices CSV" });
    },
  },
  {
    name: "finance-refund",
    description: "Partial then full refund of a confirmed payment; refund above the remaining amount and without reason refused; agent cannot refund.",
    async run(api) {
      const { payment } = await confirmedPayment(api, "card_tpe", "key-refund-pay-0001");
      await api.post(`/api/finance/payments/${payment.id}/refund`, { amountMinor: 1000, reason: "Geste" }, { label: "agent cannot refund" });
      await api.login("u_bd_finance");
      await api.post(`/api/finance/payments/${payment.id}/refund`, { amountMinor: 1000, reason: "ok" }, { label: "reason too short" });
      await api.post(`/api/finance/payments/${payment.id}/refund`, { amountMinor: 5000, reason: "Produit abîmé (démo)" }, { label: "partial refund" });
      await api.post(`/api/finance/payments/${payment.id}/refund`, { amountMinor: payment.amountMinor, reason: "Trop remboursé (démo)" }, { label: "refund above remaining" });
      await api.post(`/api/finance/payments/${payment.id}/refund`, { amountMinor: payment.amountMinor - 5000, reason: "Retour complet (démo)" }, { label: "refund the rest" });
      await api.get("/api/finance/journal", { label: "journal after refunds" });
      await api.get("/api/finance/invoices", { label: "invoices after refunds" });
    },
  },
  {
    name: "finance-refund-not-confirmed",
    description: "A pending payment cannot be refunded.",
    async run(api) {
      await api.login("u_bd_agent1");
      const { invoice } = await deliverFirstOrder(api);
      const p = await createPayment(api, invoice, "juice", "key-refund-pending1");
      await api.login("u_bd_finance");
      await api.post(`/api/finance/payments/${p.data.payment.id}/refund`, { amountMinor: 100, reason: "Essai (démo)" }, { label: "refund a pending payment" });
    },
  },
  {
    name: "finance-statement-reconciliation",
    description: "Demo bank statement generated, imported and matched: confirmed payments become settled; re-import detects duplicate lines.",
    async run(api) {
      await confirmedPayment(api, "paystation", "key-recon-pay-00001");
      await api.login("u_bd_finance");
      const st = await api.get("/api/finance/statements/demo", { label: "demo statement" });
      await api.post("/api/finance/statements", { filename: st.data.filename, content: st.data.content }, { label: "import statement" });
      await api.get("/api/finance/reconciliation");
      await api.get("/api/finance/journal?settlement=settled", { label: "settled payments" });
      await api.post("/api/finance/statements", { filename: st.data.filename, content: st.data.content }, { label: "import the same statement again" });
      await api.post("/api/finance/statements", { filename: "vide.csv", content: "pas un relevé valide" }, { label: "invalid statement" });
      await api.get("/api/finance/reconciliation?format=csv", { label: "reconciliation CSV" });
    },
  },
  {
    name: "finance-statement-anomalies",
    description: "Statement with anomalies: unmatched lines and amount mismatches create finance exceptions, resolved with a note.",
    async run(api) {
      await confirmedPayment(api, "juice", "key-anomaly-pay-001");
      await api.login("u_bd_finance");
      const st = await api.get("/api/finance/statements/demo?anomalies=1", { label: "demo statement with anomalies" });
      await api.post("/api/finance/statements", { filename: st.data.filename, content: st.data.content }, { label: "import statement with anomalies" });
      await api.get("/api/finance/reconciliation");
      const ex = await api.get("/api/exceptions?domain=finance", { label: "finance exceptions" });
      if (ex.data[0]) {
        await api.post(`/api/exceptions/${ex.data[0].id}/resolve`, { resolution: "rejected", note: "x" }, { label: "note too short" });
        await api.post(`/api/exceptions/${ex.data[0].id}/resolve`, { resolution: "rejected", note: "Ligne d'un autre compte (démo)" }, { label: "resolve" });
        await api.post(`/api/exceptions/${ex.data[0].id}/resolve`, { resolution: "approved", note: "Deuxième décision (démo)" }, { label: "resolve twice" });
      }
      await api.get("/api/exceptions?domain=finance&status=resolved", { label: "resolved exceptions" });
      await api.get("/api/exceptions?domain=finance&format=csv", { label: "exceptions CSV" });
      await api.login("u_bd_centrale");
      await api.get("/api/exceptions?domain=finance", { label: "dispatch cannot read finance exceptions" });
    },
  },
  {
    name: "finance-daily-close",
    description: "Daily close preview, close of the day, second close refused, CSV export.",
    async run(api) {
      await confirmedPayment(api, "card_tpe", "key-close-pay-00001");
      await api.login("u_bd_finance");
      await api.get("/api/finance/close");
      await api.get("/api/finance/close?day=2026-10-16", { label: "preview of yesterday" });
      await api.post("/api/finance/close", { day: "2026-10-16" }, { label: "close yesterday" });
      await api.post("/api/finance/close", { day: "2026-10-16" }, { label: "close yesterday again" });
      await api.post("/api/finance/close", { day: TODAY }, { label: "close today" });
      await api.post("/api/finance/close", { day: "2026-13-45" }, { label: "invalid day" });
      await api.get("/api/finance/close?format=csv", { label: "closes CSV" });
    },
  },
  {
    name: "finance-erp-retry",
    description: "Accounting-software entries: automatic sync, simulated failure kept with attempts and last error, then retried successfully.",
    async run(api) {
      await api.login("u_bd_admin");
      const s = await api.get("/api/admin/settings", { label: "settings", record: false });
      const settings = s.data.settings;
      await api.put("/api/admin/settings", { payments: settings.payments, erp: { ...settings.erp, simulateFailure: true } }, { label: "simulate accounting software failure" });
      await confirmedPayment(api, "paystation", "key-erp-pay-0000001");
      await api.login("u_bd_finance");
      await api.get("/api/finance/erp", { label: "entries failed" });
      await api.post("/api/finance/erp/sync", {}, { label: "retry while still failing" });
      await api.login("u_bd_admin");
      await api.put("/api/admin/settings", { payments: settings.payments, erp: { ...settings.erp, simulateFailure: false } }, { label: "accounting software back" });
      await api.login("u_bd_finance");
      await api.post("/api/finance/erp/sync", {}, { label: "retry succeeds" });
      await api.get("/api/finance/erp", { label: "entries synced" });
      await api.post("/api/finance/erp/sync", {}, { label: "nothing left to sync" });
      await api.get("/api/finance/erp?format=csv", { label: "entries CSV" });
    },
  },
];
