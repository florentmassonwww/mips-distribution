// Driver (agent): route, offline sync of deliveries and on-the-spot sales, proof of delivery, route close.
import { startAndBundle, deliverAction, sync } from "./helpers.mjs";

const SIGNATURE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

export const agent = [
  {
    name: "agent-route-start-and-bundle",
    description: "The driver sees only their routes, starts today's route, downloads the offline bundle; a closed route cannot start.",
    async run(api) {
      await api.login("u_bd_agent1");
      const r = await api.get("/api/agent/routes");
      const route = r.data.find((x) => x.status !== "closed");
      const closed = r.data.find((x) => x.status === "closed");
      await api.post(`/api/agent/routes/${route.id}/start`, {}, { label: "start today's route" });
      await api.post(`/api/agent/routes/${route.id}/start`, {}, { label: "start again" });
      await api.get(`/api/agent/routes/${route.id}/bundle`);
      await api.post(`/api/agent/routes/${closed.id}/start`, {}, { label: "start a closed route" });
      await api.get(`/api/agent/routes/${closed.id}/summary`, { label: "summary of a closed route" });
      await api.login("u_bd_agent2");
      await api.get(`/api/agent/routes/${route.id}/bundle`, { label: "another driver cannot read it" });
    },
  },
  {
    name: "agent-deliver-full",
    description: "Full delivery with receiver name and signature: invoice on delivered quantities, vehicle stock decreases.",
    async run(api) {
      await api.login("u_bd_agent1");
      const { route, bundle } = await startAndBundle(api);
      const order = bundle.orders[0];
      await sync(api, [deliverAction("act-full-000001", order, { pod: { name: "M. Receveur (démo)", note: "RAS", signature: SIGNATURE } })], "sync full delivery");
      await api.get(`/api/agent/routes/${route.id}/bundle`, { label: "bundle after delivery" });
      await api.get(`/api/agent/routes/${route.id}/summary`, { label: "route summary" });
      await api.login("u_bd_centrale");
      await api.get(`/api/chain/${order.id}`, { label: "order chain seen by dispatch" });
    },
  },
  {
    name: "agent-deliver-partial",
    description: "Partial delivery: refused without reason, accepted with a reason; invoice is on the delivered quantity only.",
    async run(api) {
      await api.login("u_bd_agent1");
      const { route, bundle } = await startAndBundle(api);
      const order = bundle.orders[1];
      const half = (l) => Math.floor(l.qty_ordered / 2);
      await sync(api, [deliverAction("act-part-000001", order, { qty: half })], "partial without reason");
      await sync(api, [deliverAction("act-part-000002", order, { qty: half, reason: "Rupture chez le client (démo)" })], "partial with reason");
      await api.get(`/api/agent/routes/${route.id}/bundle`, { label: "bundle after partial delivery" });
    },
  },
  {
    name: "agent-deliver-refused",
    description: "Refused delivery (nothing delivered): reason required, no invoice, no return allowed.",
    async run(api) {
      await api.login("u_bd_agent1");
      const { route, bundle } = await startAndBundle(api);
      const order = bundle.orders[2];
      await sync(api, [deliverAction("act-ref-0000001", order, { qty: () => 0, pod: { name: "", note: "" } })], "refused without reason");
      await sync(api, [deliverAction("act-ref-0000002", order, { qty: () => 0, reason: "Magasin fermé (démo)", pod: { name: "", note: "" }, returns: [{ productId: order.lines[0].product_id, qty: 1 }] })], "refused with a return");
      await sync(api, [deliverAction("act-ref-0000003", order, { qty: () => 0, reason: "Magasin fermé (démo)", pod: { name: "", note: "" } })], "refused with reason");
      await api.get(`/api/agent/routes/${route.id}/bundle`, { label: "bundle after refusal" });
    },
  },
  {
    name: "agent-deliver-validation",
    description: "Delivery validation: receiver name required, returns valued at the customer price, returns cannot exceed the delivery, expected total checked.",
    async run(api) {
      await api.login("u_bd_agent1");
      const { bundle } = await startAndBundle(api);
      const order = bundle.orders[0];
      await sync(api, [deliverAction("act-val-0000001", order, { pod: { name: "", note: "" } })], "missing receiver name");
      await sync(api, [deliverAction("act-val-0000002", order, { returns: [{ productId: order.lines[0].product_id, qty: 9999 }] })], "returns exceed delivery");
      await sync(api, [deliverAction("act-val-0000004", order, { qty: (l) => l.qty_ordered + 1000 })], "more than ordered and on board");
      await sync(api, [deliverAction("act-val-0000003", order, { expectedTotalMinor: 1 })], "expected total differs from the server total");
      const other = bundle.orders[1];
      await sync(api, [deliverAction("act-val-0000005", other, { returns: [{ productId: other.lines[0].product_id, qty: 1 }] })], "full delivery with one return");
      await sync(api, [deliverAction("act-val-0000006", other)], "deliver the same order again");
    },
  },
  {
    name: "agent-sync-idempotent",
    description: "Replaying the same offline action (same id) returns the first result and changes nothing; a batch mixes new and replayed actions.",
    async run(api) {
      await api.login("u_bd_agent1");
      const { route, bundle } = await startAndBundle(api);
      const a1 = deliverAction("act-idem-000001", bundle.orders[0]);
      const a2 = deliverAction("act-idem-000002", bundle.orders[1]);
      await sync(api, [a1], "first sync");
      await sync(api, [a1], "same action replayed");
      await sync(api, [a1, a2], "batch with a replay and a new action");
      await api.get(`/api/agent/routes/${route.id}/bundle`, { label: "bundle after replays" });
      await sync(api, [{ id: "short", type: "deliver", payload: {} }], "invalid action id");
      await sync(api, [{ id: "act-bad-payload1", type: "deliver", payload: { orderId: "x" } }], "invalid payload");
    },
  },
  {
    name: "agent-sale-on-the-spot",
    description: "On-the-spot sale to an outlet not on the route, from vehicle stock; stock limits and customer price list apply.",
    async run(api) {
      await api.login("u_bd_agent1");
      const { route, bundle } = await startAndBundle(api);
      const onRoute = new Set(bundle.stops.map((s) => s.customer_id));
      const outlet = bundle.customers.find((c) => !onRoute.has(c.id) && c.price_list_id) ?? bundle.customers.find((c) => !onRoute.has(c.id));
      const product = Object.entries(bundle.stock).find(([, q]) => q > 3)[0];
      const sale = (id, qty) => ({ id, type: "sale", payload: { routeId: route.id, customerId: outlet.id, lines: [{ productId: product, qty }], returns: [], pod: { name: "Gérant (démo)", note: "" }, at: "2026-10-17T05:00:00.000Z" } });
      await sync(api, [sale("act-sale-000001", 2)], "sale to an outlet off the route");
      await sync(api, [sale("act-sale-000002", bundle.stock[product] + 1)], "sale above vehicle stock");
      await sync(api, [{ ...sale("act-sale-000003", 1), payload: { ...sale("x", 1).payload, customerId: "c_inconnu" } }], "sale to unknown customer");
      await api.get(`/api/agent/routes/${route.id}/bundle`, { label: "bundle after sale" });
    },
  },
  {
    name: "agent-route-close",
    description: "Closing the route: summary of delivered, refused, collected; remaining stock returned to the warehouse; closed route is read-only.",
    async run(api) {
      await api.login("u_bd_agent1");
      const { route, bundle } = await startAndBundle(api);
      await sync(api, [deliverAction("act-close-00001", bundle.orders[0])], "deliver one order");
      await api.login("u_bd_centrale");
      await api.get("/api/centrale/stock", { label: "warehouse before close" });
      await api.login("u_bd_agent1");
      await api.post(`/api/agent/routes/${route.id}/close`, {}, { label: "close refused while orders are open" });
      await api.get(`/api/agent/routes/${route.id}/summary`, { label: "summary before close" });
      await sync(api, [deliverAction("act-close-00002", bundle.orders[1]), deliverAction("act-close-00003", bundle.orders[2], { qty: () => 0, reason: "Client absent (démo)", pod: { name: "", note: "" } })], "deliver one more, declare the last one not delivered");
      await api.post(`/api/agent/routes/${route.id}/close`, {}, { label: "close route" });
      await sync(api, [deliverAction("act-close-00004", bundle.orders[0])], "sync after close");
      await api.post(`/api/agent/routes/${route.id}/close`, {}, { label: "close twice" });
      await api.login("u_bd_centrale");
      await api.get("/api/centrale/stock", { label: "warehouse after close" });
      await api.get("/api/exceptions", { label: "ops exceptions after close" });
      await api.get("/api/agent/routes", { label: "dispatcher cannot use the agent API" });
      await api.login("u_bd_agent1");
      await api.get("/api/agent/routes", { label: "route list after close" });
      await api.get(`/api/agent/routes/${route.id}/summary`, { label: "summary after close" });
    },
  },
];
