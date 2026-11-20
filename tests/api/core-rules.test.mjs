// Step 3 rules seen through the API, where no characterization scenario plays them: an action done
// offline (R10), a total shown on the phone that differs from the invoice (R07), a status query
// reporting another amount (R17). The rules themselves are tested in packages/core/test.
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { deliverFirstOrder, startServer } from "./lib/server.mjs";

describe("core rules through the API", () => {
  let server;
  let agent;
  beforeEach(async () => {
    server = await startServer();
    agent = await server.as("u_bd_agent1");
  });
  afterEach(() => server.close());

  /** Today's route of the agent, started, with its bundle. */
  const openRoute = async () => {
    const { data: session } = await agent.get("/api/session");
    const route = (await agent.get("/api/agent/routes")).data.find((r) => r.day === session.today && r.status !== "closed");
    if (route.status !== "in_progress") await agent.post(`/api/agent/routes/${route.id}/start`);
    return (await agent.get(`/api/agent/routes/${route.id}/bundle`)).data;
  };

  /** Delivers an order in full; `extra` overrides fields of the payload. */
  const deliver = (order, id, extra = {}) =>
    agent.post("/api/agent/sync", {
      actions: [
        {
          id,
          type: "deliver",
          payload: {
            orderId: order.id,
            lines: order.lines.map((line) => ({ lineId: line.id, qtyDelivered: line.qty_ordered })),
            returns: [],
            reason: "",
            pod: { name: "Réceptionnaire (test)", note: "" },
            at: new Date().toISOString(),
            ...extra,
          },
        },
      ],
    });

  const deliveryAudit = async () => {
    const admin = await server.as("u_bd_admin");
    return (await admin.get("/api/admin/audit")).data.filter((entry) => entry.action === "delivery.full");
  };

  test("R10 · a delivery done more than two minutes before it reaches the server is recorded as offline", async () => {
    const bundle = await openRoute();
    const [first, second] = bundle.orders;
    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString();
    assert.equal((await deliver(first, "act-r10-offline-01", { at: tenMinutesAgo })).data.results[0].status, "applied");
    assert.equal((await deliver(second, "act-r10-online-001")).data.results[0].status, "applied");
    const byOrder = Object.fromEntries((await deliveryAudit()).map((entry) => [entry.details.order, entry.details.offline]));
    assert.equal(byOrder[first.number], true);
    assert.equal(byOrder[second.number], false);
  });

  test("R07 · a total shown on the phone that differs from the invoice is reported to the driver and the office", async () => {
    const bundle = await openRoute();
    const [order, other] = bundle.orders;
    const sync = await deliver(order, "act-r07-mismatch-1", { expectedTotalMinor: 1 });
    const { result } = sync.data.results[0];
    assert.deepEqual(result.priceMismatch, { shownMinor: 1, invoicedMinor: result.amountMinor });
    const dispatcher = await server.as("u_bd_centrale");
    const exceptions = (await dispatcher.get("/api/exceptions?domain=ops")).data.filter((exception) => exception.type === "price_mismatch");
    assert.equal(exceptions.length, 1);
    assert.deepEqual(exceptions[0].details, { order: result.orderNumber, shownMinor: 1, invoicedMinor: result.amountMinor });
    // The same total as the invoice: nothing to report.
    const total = other.lines.reduce((sum, line) => sum + line.qty_ordered * line.unit_price_minor, 0);
    const fine = (await deliver(other, "act-r07-same-total1", { expectedTotalMinor: total })).data.results[0].result;
    assert.equal(fine.amountMinor, total);
    assert.equal("priceMismatch" in fine, false);
  });

  test("R17 · a status query confirms only the amount requested", async () => {
    const invoice = await deliverFirstOrder(agent);
    const { data } = await agent.post("/api/payments", {
      invoiceId: invoice.id,
      method: "juice",
      amountMinor: invoice.amount_minor,
      idempotencyKey: "test-r17-status-amount",
    });
    const paymentId = data.payment.id;
    // The simulated provider receives 1.00 less than requested.
    assert.equal((await agent.post(`/api/demo/payments/${paymentId}/simulate`, { outcome: "wrong_amount" })).status, 200);
    const checked = await agent.post(`/api/payments/${paymentId}/check`, {});
    assert.equal(checked.data.status, "to_verify");
    assert.equal(checked.data.confirmedAt, null);

    const finance = await server.as("u_bd_finance");
    const open = (await finance.get("/api/exceptions?domain=finance")).data.filter((exception) => exception.entity_id === paymentId);
    assert.deepEqual(open.map((exception) => exception.type).sort(), ["amount_mismatch", "payment_to_verify"]);
    const resolve = await finance.post(`/api/exceptions/${open[0].id}/resolve`, { resolution: "approved", note: "Vu avec le prestataire (test)" });
    assert.equal(resolve.status, 409);
    assert.equal(resolve.data.error.code, "needs_provider");
    assert.equal((await agent.get(`/api/payments/${paymentId}`)).data.status, "to_verify");
  });

  test("R17 · a lost notification is still confirmed by the status query at the amount requested", async () => {
    const invoice = await deliverFirstOrder(agent);
    const { data } = await agent.post("/api/payments", {
      invoiceId: invoice.id,
      method: "paystation",
      amountMinor: invoice.amount_minor,
      idempotencyKey: "test-r17-lost-notif01",
    });
    const paymentId = data.payment.id;
    await agent.post(`/api/demo/payments/${paymentId}/simulate`, { outcome: "lost_notification" });
    assert.equal((await agent.get(`/api/payments/${paymentId}`)).data.status, "pending");
    const checked = await agent.post(`/api/payments/${paymentId}/check`, {});
    assert.equal(checked.data.status, "confirmed");
    assert.equal(checked.data.confirmedVia, "status_query");
  });
});
