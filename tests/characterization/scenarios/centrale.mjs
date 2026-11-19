// Dispatch (centrale): reference data, orders, routes, loading and warehouse stock.
import { TODAY } from "./helpers.mjs";

export const centrale = [
  {
    name: "centrale-reference-and-dashboard",
    description: "Dispatcher reads the dashboard, reference data, orders, routes and stock.",
    async run(api) {
      await api.login("u_bd_centrale");
      await api.get("/api/centrale/dashboard");
      await api.get("/api/centrale/reference");
      await api.get("/api/centrale/orders");
      await api.get("/api/centrale/orders?status=confirmed", { label: "orders filtered by status" });
      await api.get("/api/centrale/routes");
      await api.get("/api/centrale/stock");
    },
  },
  {
    name: "centrale-order-lifecycle",
    description: "Create an order at the customer's price list, read its chain, assign it to a route, prepare it, cancel another one; invalid inputs refused.",
    async run(api) {
      await api.login("u_bd_centrale");
      const ref = await api.get("/api/centrale/reference", { label: "reference", record: false });
      const gc = ref.data.customers.find((c) => c.price_list);
      const plain = ref.data.customers.find((c) => !c.price_list);
      const [p1, p2] = ref.data.products;
      const o1 = await api.post("/api/centrale/orders", { customerId: gc.id, note: "Commande test", lines: [{ productId: p1.id, qty: 3 }, { productId: p2.id, qty: 2 }] }, { label: "order for a price-list customer" });
      const o2 = await api.post("/api/centrale/orders", { customerId: plain.id, lines: [{ productId: p1.id, qty: 1 }] }, { label: "order at base prices" });
      await api.post("/api/centrale/orders", { customerId: plain.id, lines: [] }, { label: "order without lines refused" });
      await api.post("/api/centrale/orders", { customerId: "c_inconnu", lines: [{ productId: p1.id, qty: 1 }] }, { label: "unknown customer refused" });
      await api.post("/api/centrale/orders", { customerId: plain.id, lines: [{ productId: "p_inconnu", qty: 1 }] }, { label: "unknown product refused" });
      await api.get(`/api/chain/${o1.data.id}`, { label: "order chain" });
      const routes = await api.get("/api/centrale/routes", { label: "routes", record: false });
      const planned = routes.data.find((r) => r.status === "planned") ?? routes.data.find((r) => r.status !== "closed" && r.status !== "in_progress");
      api.must(planned, "a route that still accepts orders");
      await api.post(`/api/centrale/orders/${o1.data.id}/assign`, { routeId: planned.id }, { label: "assign to a route" });
      await api.post(`/api/centrale/orders/${o1.data.id}/status`, { status: "prepared" }, { label: "mark prepared" });
      await api.post(`/api/centrale/orders/${o2.data.id}/status`, { status: "cancelled" }, { label: "cancel second order" });
      await api.post(`/api/centrale/orders/${o2.data.id}/status`, { status: "prepared" }, { label: "prepare a cancelled order" });
      await api.post(`/api/centrale/orders/${o1.data.id}/assign`, { routeId: null }, { label: "unassign" });
      const closed = routes.data.find((r) => r.status === "closed");
      await api.post(`/api/centrale/orders/${o1.data.id}/assign`, { routeId: closed.id }, { label: "assign to a closed route" });
      await api.get("/api/centrale/orders", { label: "orders after changes" });
      await api.get(`/api/chain/${o1.data.id}`, { label: "chain after changes" });
    },
  },
  {
    name: "centrale-route-create-load",
    description: "Create a route with stops and an agent, rename it, assign an order, load it (warehouse to vehicle stock, with extras), then try to change a loaded route.",
    async run(api) {
      await api.login("u_bd_centrale");
      const ref = await api.get("/api/centrale/reference", { label: "reference", record: false });
      const agent = ref.data.agents.find((a) => a.id !== "u_bd_agent1") ?? ref.data.agents[0];
      const [c1, c2] = ref.data.customers;
      const created = await api.post("/api/centrale/routes", { name: "Centre - Test", day: TODAY, agentId: agent.id, vehicle: "Camion 99 (démo)", customerIds: [c1.id, c2.id] }, { label: "create route" });
      await api.post("/api/centrale/routes", { name: "X", day: "17/10/2026" }, { label: "invalid route refused" });
      await api.post("/api/centrale/routes", { name: "Agent inconnu", day: TODAY, agentId: "u_inconnu" }, { label: "unknown agent refused" });
      const id = created.data.id;
      await api.patch(`/api/centrale/routes/${id}`, { name: "Centre - Test (renommée)", customerIds: [c2.id, c1.id] }, { label: "rename and reorder stops" });
      const order = await api.post("/api/centrale/orders", { customerId: c1.id, routeId: id, lines: [{ productId: ref.data.products[0].id, qty: 2 }] }, { label: "order on the new route" });
      await api.post(`/api/centrale/orders/${order.data.id}/status`, { status: "prepared" }, { label: "prepare order" });
      await api.get("/api/centrale/stock", { label: "stock before loading" });
      await api.post(`/api/centrale/routes/${id}/load`, { extras: [{ productId: ref.data.products[1].id, qty: 5 }] }, { label: "load with extras" });
      await api.get(`/api/centrale/routes/${id}`, { label: "route after loading" });
      await api.get("/api/centrale/stock", { label: "stock after loading" });
      await api.post(`/api/centrale/routes/${id}/load`, { extras: [] }, { label: "load twice" });
      await api.patch(`/api/centrale/routes/${id}`, { agentId: ref.data.agents[0].id }, { label: "change agent after loading" });
    },
  },
  {
    name: "centrale-load-insufficient-stock",
    description: "Loading more than the warehouse holds is refused and nothing moves.",
    async run(api) {
      await api.login("u_bd_centrale");
      const ref = await api.get("/api/centrale/reference", { label: "reference", record: false });
      const product = ref.data.products[0];
      const created = await api.post("/api/centrale/routes", { name: "Surcharge - Test", day: TODAY, agentId: ref.data.agents[0].id, customerIds: [] }, { label: "create empty route with an agent" });
      await api.post(`/api/centrale/routes/${created.data.id}/load`, { extras: [{ productId: product.id, qty: product.qty + 1000 }] }, { label: "load more than the warehouse" });
      await api.get("/api/centrale/stock", { label: "stock unchanged" });
    },
  },
  {
    name: "centrale-stock-adjust",
    description: "Warehouse adjustments need a reason (≥ 3 characters) and a non-zero delta; each one is a traced movement.",
    async run(api) {
      await api.login("u_bd_centrale");
      const stock = await api.get("/api/centrale/stock", { label: "stock before" });
      const productId = stock.data.warehouse[0]?.id;
      api.must(productId, "a product in the warehouse");
      await api.post("/api/centrale/stock/adjust", { productId, delta: 12, reason: "Réception fournisseur (démo)" }, { label: "positive adjustment" });
      await api.post("/api/centrale/stock/adjust", { productId, delta: -2, reason: "Casse (démo)" }, { label: "negative adjustment" });
      await api.post("/api/centrale/stock/adjust", { productId, delta: -5, reason: "ok" }, { label: "reason too short refused" });
      await api.post("/api/centrale/stock/adjust", { productId, delta: 0, reason: "Zéro" }, { label: "zero delta refused" });
      await api.post("/api/centrale/stock/adjust", { productId, delta: -100000, reason: "Plus que le stock" }, { label: "below zero" });
      await api.get("/api/centrale/stock", { label: "stock after" });
      await api.login("u_bd_finance");
      await api.post("/api/centrale/stock/adjust", { productId, delta: 1, reason: "Finance" }, { label: "finance cannot adjust" });
    },
  },
];
