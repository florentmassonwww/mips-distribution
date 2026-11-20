// In-process apps/api instance for the API tests: a fresh in-memory database with the demo data,
// and one client (cookie jar) per signed-in user.
import { createInstance } from "../../../apps/api/src/app.ts";

const ORIGIN = "http://api.test";
const CSRF = { "X-Requested-With": "mips-distribution" };

/** Starts a fresh instance. `as(userId)` returns a client signed in as that demo user. */
export async function startServer() {
  const instance = await createInstance({ sessionSecret: "test-session-secret", webhookSecret: "test-webhook-secret" });

  function client() {
    const jar = new Map();
    const request = async (method, path, body) => {
      const headers = new Headers(method === "GET" ? {} : CSRF);
      if (body !== undefined) headers.set("Content-Type", "application/json");
      if (jar.size) headers.set("Cookie", [...jar].map(([name, value]) => `${name}=${value}`).join("; "));
      const res = await instance.app.fetch(
        new Request(ORIGIN + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }),
      );
      for (const cookie of res.headers.getSetCookie()) {
        const [pair] = cookie.split(";");
        const at = pair.indexOf("=");
        const value = pair.slice(at + 1).trim();
        if (value) jar.set(pair.slice(0, at).trim(), value);
        else jar.delete(pair.slice(0, at).trim());
      }
      const text = await res.text();
      const isJson = (res.headers.get("content-type") ?? "").includes("json");
      return { status: res.status, data: isJson ? JSON.parse(text) : text };
    };
    return {
      request,
      get: (path) => request("GET", path),
      post: (path, body = {}) => request("POST", path, body),
      put: (path, body = {}) => request("PUT", path, body),
      patch: (path, body = {}) => request("PATCH", path, body),
    };
  }

  return {
    instance,
    /** Client without a session. */
    anonymous: client,
    /** Client signed in as a demo user (by id). */
    async as(userId) {
      const c = client();
      const res = await c.post("/api/demo/login", { userId });
      if (res.status !== 200) throw new Error(`login ${userId} failed: ${res.status}`);
      return c;
    },
    /** Every API route (method and path) registered on the application, middleware excluded. */
    routes() {
      // Hono lists a route once per handler (guard and handler): keep each method and path once.
      const seen = new Map();
      for (const { method, path } of instance.app.routes) if (method !== "ALL") seen.set(`${method} ${path}`, { method, path });
      return [...seen.values()];
    },
    close() {
      instance.db.close();
    },
  };
}

/** Delivers the first order of the agent's open route today and returns its invoice (from the bundle). */
export async function deliverFirstOrder(agent) {
  const { data: session } = await agent.get("/api/session");
  const { data: routes } = await agent.get("/api/agent/routes");
  const route = routes.find((r) => r.day === session.today && r.status !== "closed");
  if (!route) throw new Error("the agent has no open route today");
  if (route.status !== "in_progress") await agent.post(`/api/agent/routes/${route.id}/start`);
  const { data: bundle } = await agent.get(`/api/agent/routes/${route.id}/bundle`);
  const order = bundle.orders[0];
  const sync = await agent.post("/api/agent/sync", {
    actions: [
      {
        id: `deliver-${order.id}`,
        type: "deliver",
        payload: {
          orderId: order.id,
          lines: order.lines.map((line) => ({ lineId: line.id, qtyDelivered: line.qty_ordered })),
          returns: [],
          reason: "",
          pod: { name: "Réceptionnaire (test)", note: "" },
          at: new Date().toISOString(),
        },
      },
    ],
  });
  if (sync.status !== 200 || sync.data.results[0].status !== "applied") throw new Error(`delivery failed: ${JSON.stringify(sync.data)}`);
  const { data: after } = await agent.get(`/api/agent/routes/${route.id}/bundle`);
  return after.invoices.find((invoice) => invoice.order_id === order.id);
}

/** Collects the invoice in full with `method`, confirmed by the simulated provider. Returns the payment id. */
export async function payInFull(agent, invoice, method) {
  const res = await agent.post("/api/payments", {
    invoiceId: invoice.id,
    method,
    amountMinor: invoice.amount_minor,
    idempotencyKey: `test-${method}-${invoice.id}`.slice(0, 64),
  });
  if (res.status !== 200) throw new Error(`payment failed: ${JSON.stringify(res.data)}`);
  const simulated = await agent.post(`/api/demo/payments/${res.data.payment.id}/simulate`, { outcome: "success" });
  if (simulated.data.result !== "confirmed") throw new Error(`payment not confirmed: ${JSON.stringify(simulated.data)}`);
  return res.data.payment.id;
}
