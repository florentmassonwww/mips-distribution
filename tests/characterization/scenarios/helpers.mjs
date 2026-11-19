// Shared steps. Identifiers are always discovered through the API (never hard-coded), so the same
// scenarios run unchanged against the reference and against the rebuilt server.

export const TODAY = "2026-10-17";

/** Today's route of an agent, read from the agent's own route list. */
export async function todaysRoute(api, label = "agent routes") {
  const r = await api.get("/api/agent/routes", { label });
  const route = r.data.find((x) => x.day === TODAY && x.status !== "closed");
  api.must(route, "the agent has an open route today");
  return route;
}

export async function startAndBundle(api) {
  const route = await todaysRoute(api);
  if (route.status !== "in_progress") await api.post(`/api/agent/routes/${route.id}/start`, {}, { label: "start route" });
  const b = await api.get(`/api/agent/routes/${route.id}/bundle`, { label: "route bundle" });
  return { route, bundle: b.data };
}

/** Builds a "deliver" offline action for an order of the bundle. `qty(line)` gives the delivered quantity. */
export function deliverAction(id, order, { qty = (l) => l.qty_ordered, reason = "", pod = { name: "Réceptionnaire (démo)", note: "" }, returns = [], at = "2026-10-17T04:30:00.000Z", expectedTotalMinor } = {}) {
  return {
    id,
    type: "deliver",
    payload: {
      orderId: order.id,
      lines: order.lines.map((l) => ({ lineId: l.id, qtyDelivered: qty(l) })),
      returns,
      reason,
      pod,
      at,
      ...(expectedTotalMinor !== undefined ? { expectedTotalMinor } : {}),
    },
  };
}

export async function sync(api, actions, label = "sync") {
  return api.post("/api/agent/sync", { actions }, { label });
}

/** Delivers the first order of today's route in full and returns the resulting invoice from the bundle. */
export async function deliverFirstOrder(api, actionId = "act-deliver-0001") {
  const { route, bundle } = await startAndBundle(api);
  const order = bundle.orders[0];
  await sync(api, [deliverAction(actionId, order)], "deliver first order in full");
  const b = await api.get(`/api/agent/routes/${route.id}/bundle`, { label: "bundle after delivery" });
  const invoice = b.data.invoices.find((i) => i.order_id === order.id) ?? b.data.invoices[0];
  api.must(invoice, "an invoice is issued for the delivered order");
  return { route, order, invoice, bundle: b.data };
}

export async function createPayment(api, invoice, method, key, amountMinor) {
  const amount = amountMinor ?? invoice.amount_minor - (invoice.paid_minor ?? 0);
  return api.post("/api/payments", { invoiceId: invoice.id, method, amountMinor: amount, idempotencyKey: key }, { label: `create ${method} payment` });
}

export async function simulate(api, paymentId, outcome) {
  return api.post(`/api/demo/payments/${paymentId}/simulate`, { outcome }, { label: `simulate ${outcome}` });
}
