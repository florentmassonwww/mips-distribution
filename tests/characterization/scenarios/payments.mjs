// Payment at delivery: one connector per method, all simulated. A payment is confirmed only by a
// signed provider notification or a status query; never by the driver.
import { deliverFirstOrder, createPayment, simulate } from "./helpers.mjs";

export const payments = [
  {
    name: "payment-paystation-success",
    description: "PayStation payment: pending, then confirmed by the signed notification; invoice paid; receipt.",
    async run(api) {
      await api.login("u_bd_agent1");
      const { invoice } = await deliverFirstOrder(api);
      const p = await createPayment(api, invoice, "paystation", "key-paystation-0001");
      await api.get(`/api/payments/${p.data.payment.id}`, { label: "payment while pending" });
      await simulate(api, p.data.payment.id, "success");
      await api.get(`/api/payments/${p.data.payment.id}`, { label: "payment after notification" });
      await api.get(`/api/invoices/${invoice.id}/receipt`, { label: "receipt" });
    },
  },
  {
    name: "payment-each-method-success",
    description: "Card on terminal, Juice and payment link each go pending then confirmed by notification.",
    async run(api) {
      await api.login("u_bd_agent1");
      const { route, bundle } = await deliverFirstOrder(api);
      const { deliverAction, sync } = await import("./helpers.mjs");
      await sync(api, [deliverAction("act-meth-000002", bundle.orders[1]), deliverAction("act-meth-000003", bundle.orders[2])], "deliver two more orders");
      const b = await api.get(`/api/agent/routes/${route.id}/bundle`, { label: "bundle with three invoices" });
      const methods = ["card_tpe", "juice", "link"];
      for (let i = 0; i < 3; i++) {
        const inv = b.data.invoices[i];
        const p = await createPayment(api, inv, methods[i], `key-method-${methods[i]}-01`);
        await simulate(api, p.data.payment.id, "success");
        await api.get(`/api/payments/${p.data.payment.id}`, { label: `${methods[i]} after notification` });
      }
    },
  },
  {
    name: "payment-failure-then-retry",
    description: "A failed attempt frees the invoice; a new attempt (new key) can then succeed.",
    async run(api) {
      await api.login("u_bd_agent1");
      const { invoice } = await deliverFirstOrder(api);
      const p1 = await createPayment(api, invoice, "juice", "key-fail-juice-0001");
      await simulate(api, p1.data.payment.id, "failure");
      await api.get(`/api/payments/${p1.data.payment.id}`, { label: "failed payment" });
      const p2 = await createPayment(api, invoice, "card_tpe", "key-fail-card-00002");
      await simulate(api, p2.data.payment.id, "success");
      await api.get(`/api/payments/${p2.data.payment.id}`, { label: "second attempt confirmed" });
    },
  },
  {
    name: "payment-one-pending-attempt",
    description: "No double charge: a second attempt on the same invoice is refused while one is pending; the same key replays the first attempt.",
    async run(api) {
      await api.login("u_bd_agent1");
      const { invoice } = await deliverFirstOrder(api);
      await api.post("/api/payments", { invoiceId: invoice.id, method: "paystation", amountMinor: invoice.amount_minor + 100, idempotencyKey: "key-single-pending00" }, { label: "amount above balance" });
      await createPayment(api, invoice, "paystation", "key-single-pending01");
      await createPayment(api, invoice, "paystation", "key-single-pending01");
      await createPayment(api, invoice, "juice", "key-single-pending02");
      await api.post("/api/payments", { invoiceId: invoice.id, method: "cash", amountMinor: 100, idempotencyKey: "key-single-pending04" }, { label: "unknown method" });
      await api.post("/api/payments", { invoiceId: invoice.id, method: "paystation", amountMinor: 100, idempotencyKey: "short" }, { label: "idempotency key too short" });
    },
  },
  {
    name: "payment-partial",
    description: "Partial payment confirmed: invoice partially paid; the balance can be collected with another method.",
    async run(api) {
      await api.login("u_bd_agent1");
      const { invoice, route } = await deliverFirstOrder(api);
      const part = Math.floor(invoice.amount_minor / 3);
      const p1 = await createPayment(api, invoice, "juice", "key-partial-000001", part);
      await simulate(api, p1.data.payment.id, "success");
      const b = await api.get(`/api/agent/routes/${route.id}/bundle`, { label: "bundle after partial payment" });
      const inv = b.data.invoices.find((i) => i.id === invoice.id);
      const p2 = await createPayment(api, inv, "card_tpe", "key-partial-000002");
      await simulate(api, p2.data.payment.id, "success");
      await api.get(`/api/invoices/${invoice.id}/receipt`, { label: "receipt with two payments" });
    },
  },
  {
    name: "payment-lost-notification-status-query",
    description: "Notification lost: the payment stays pending until the status query confirms it (confirmed_via status query).",
    async run(api) {
      await api.login("u_bd_agent1");
      const { invoice } = await deliverFirstOrder(api);
      const p = await createPayment(api, invoice, "paystation", "key-lost-notif-0001");
      await simulate(api, p.data.payment.id, "lost_notification");
      await api.get(`/api/payments/${p.data.payment.id}`, { label: "still pending" });
      await api.post(`/api/payments/${p.data.payment.id}/check`, {}, { label: "status query" });
      await api.post(`/api/payments/${p.data.payment.id}/check`, {}, { label: "status query again" });
    },
  },
  {
    name: "payment-duplicate-notification",
    description: "A duplicated notification adds nothing (idempotent): one confirmation, one amount.",
    async run(api) {
      await api.login("u_bd_agent1");
      const { invoice, route } = await deliverFirstOrder(api);
      const p = await createPayment(api, invoice, "juice", "key-dup-notif-00001");
      await simulate(api, p.data.payment.id, "duplicate");
      await simulate(api, p.data.payment.id, "success");
      await simulate(api, p.data.payment.id, "duplicate");
      await simulate(api, p.data.payment.id, "duplicate");
      await api.get(`/api/payments/${p.data.payment.id}`, { label: "payment after duplicates" });
      await api.get(`/api/agent/routes/${route.id}/bundle`, { label: "invoice paid once" });
      await api.login("u_bd_finance");
      await api.get("/api/finance/journal", { label: "journal shows one payment" });
    },
  },
  {
    name: "payment-wrong-amount-to-verify",
    description: "A notification with a different amount puts the payment in 'to verify' with a finance exception; it is never confirmed by hand.",
    async run(api) {
      await api.login("u_bd_agent1");
      const { invoice } = await deliverFirstOrder(api);
      const p = await createPayment(api, invoice, "paystation", "key-wrong-amount-01");
      await simulate(api, p.data.payment.id, "wrong_amount");
      await api.get(`/api/payments/${p.data.payment.id}`, { label: "payment to verify" });
      await api.post(`/api/payments/${p.data.payment.id}/check`, {}, { label: "status query on a payment to verify" });
      await api.login("u_bd_finance");
      const ex = await api.get("/api/exceptions?domain=finance", { label: "finance exceptions" });
      const e = ex.data.find((x) => x.entity_id === p.data.payment.id) ?? ex.data[0];
      if (e) await api.post(`/api/exceptions/${e.id}/resolve`, { resolution: "approved", note: "Vérifié avec le prestataire (démo)" }, { label: "resolve exception" });
      await api.get(`/api/payments/${p.data.payment.id}`, { label: "payment after exception resolution" });
    },
  },
  {
    name: "payment-cancel-and-claim",
    description: "A pending attempt can be cancelled; a customer claim ('I paid') only moves it to 'to verify', never to confirmed.",
    async run(api) {
      await api.login("u_bd_agent1");
      const { invoice } = await deliverFirstOrder(api);
      const p1 = await createPayment(api, invoice, "paystation", "key-cancel-0000001");
      await api.post(`/api/payments/${p1.data.payment.id}/cancel`, {}, { label: "cancel pending attempt" });
      await api.post(`/api/payments/${p1.data.payment.id}/cancel`, {}, { label: "cancel again" });
      const p2 = await createPayment(api, invoice, "juice", "key-claim-00000001");
      await api.post(`/api/payments/${p2.data.payment.id}/claim`, {}, { label: "customer says they paid" });
      await api.get(`/api/payments/${p2.data.payment.id}`, { label: "claimed payment" });
      await simulate(api, p2.data.payment.id, "success");
      await api.get(`/api/payments/${p2.data.payment.id}`, { label: "confirmed later by notification" });
    },
  },
  {
    name: "payment-expiry",
    description: "A pending attempt expires after the configured attempt time; the invoice can be collected again.",
    async run(api) {
      await api.login("u_bd_agent1");
      const { invoice } = await deliverFirstOrder(api);
      const p = await createPayment(api, invoice, "paystation", "key-expiry-0000001");
      await api.wait(11, "wait 11 minutes");
      await api.post(`/api/payments/${p.data.payment.id}/check`, {}, { label: "status query after expiry" });
      await createPayment(api, invoice, "juice", "key-expiry-0000002");
    },
  },
  {
    name: "payment-link-public-page",
    description: "Payment link: public page without login, simulated payment by the customer, link no longer payable afterwards.",
    async run(api) {
      await api.login("u_bd_agent1");
      const { invoice } = await deliverFirstOrder(api);
      const p = await createPayment(api, invoice, "link", "key-link-public-001");
      const token = p.data.payment.link_token ?? p.data.payment.linkToken ?? (p.data.payment.presentation?.value ?? "").split("/").pop();
      api.must(token, "the link payment exposes a token");
      await api.logout();
      await api.get(`/api/public/pay/${token}`, { label: "public payment page" });
      await api.post(`/api/public/pay/${token}/demo`, { outcome: "success" }, { label: "customer pays" });
      await api.get(`/api/public/pay/${token}`, { label: "page after payment" });
      await api.post(`/api/public/pay/${token}/demo`, { outcome: "success" }, { label: "pay twice" });
      await api.get("/api/public/pay/jeton-inconnu-000000", { label: "unknown link" });
    },
  },
  {
    name: "payment-webhook-signature",
    description: "Provider notifications: unknown provider, missing or wrong signature are rejected and change nothing.",
    async run(api) {
      await api.login("u_bd_agent1");
      const { invoice } = await deliverFirstOrder(api);
      const p = await createPayment(api, invoice, "paystation", "key-webhook-sig-001");
      await api.logout();
      const body = JSON.stringify({ eventId: "evt-forged-1", providerRef: "inconnu", status: "succeeded", amountMinor: invoice.amount_minor });
      await api.call("POST", "/api/webhooks/unknown", body, { csrf: false, label: "unknown provider" });
      await api.call("POST", "/api/webhooks/paystation", body, { csrf: false, label: "missing signature" });
      await api.call("POST", "/api/webhooks/paystation", body, { csrf: false, headers: { "X-Signature": "t=1,v1=deadbeef" }, label: "wrong signature" });
      await api.login("u_bd_agent1");
      await api.get(`/api/payments/${p.data.payment.id}`, { label: "payment unchanged" });
    },
  },
];
