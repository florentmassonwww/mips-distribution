// Scenario API: every call is recorded in a transcript (request + normalized response).
// A transport provides `request(method, url, body, headers)` and `advance(ms)`; the reference
// transport drives the compiled v0.1.0, later transports will drive the rebuilt server.
import { createNormalizer } from "./normalize.mjs";

export const CSRF_HEADER = { "X-Requested-With": "mips-distribution" };

export function createApi(transport) {
  const norm = createNormalizer();
  const transcript = [];
  let actor = null;

  const call = async (method, path, body, opts = {}) => {
    const headers = { ...(method === "GET" || opts.csrf === false ? {} : CSRF_HEADER), ...(opts.headers ?? {}) };
    const res = await transport.request(method, path, body, headers);
    transcript.push({
      step: opts.label ?? `${method} ${path}`,
      as: actor,
      request: { method, path: norm.path(path), ...(body !== undefined ? { body: norm.value(typeof body === "string" ? body : JSON.parse(JSON.stringify(body))) } : {}) },
      status: res.status,
      ...(res.type && res.type !== "application/json" ? { type: res.type } : {}),
      response: opts.record === false ? "<not recorded>" : norm.value(res.data),
    });
    // Each call takes one simulated second, so ordering by time is unambiguous.
    await transport.advance(1000);
    return res;
  };

  return {
    transcript,
    call,
    get: (p, o) => call("GET", p, undefined, o),
    post: (p, b = {}, o) => call("POST", p, b, o),
    put: (p, b = {}, o) => call("PUT", p, b, o),
    patch: (p, b = {}, o) => call("PATCH", p, b, o),
    async login(userId) {
      actor = userId;
      const r = await call("POST", "/api/demo/login", { userId }, { label: `login ${userId}` });
      if (r.status !== 200) throw new Error(`login ${userId} failed: ${r.status}`);
      return r;
    },
    async logout() {
      await call("POST", "/api/logout", {}, { label: "logout" });
      actor = null;
    },
    /** Advances the simulated clock (minutes) without an API call. */
    async wait(minutes, label) {
      await transport.advance(minutes * 60000);
      transcript.push({ step: label ?? `wait ${minutes} min` });
    },
    /** Fails the scenario when a precondition on the data is not met. */
    must(cond, message) {
      if (!cond) throw new Error(`scenario precondition failed: ${message}`);
    },
  };
}
