// Cross-cutting HTTP behaviour: error responses, CSRF header check, no-store caching, and the
// optional access-code gate.
import { createHmac, timingSafeEqual } from "node:crypto";
import type { ErrorHandler, MiddlewareHandler } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";
import { ApiError } from "../core/errors.ts";
import { type App, type AppDeps, type AppEnv, clientKey, readJson } from "./context.ts";
import { COOKIE_LIFETIME_SECONDS, GATE_COOKIE } from "./session.ts";
import { ONE_MINUTE_MS } from "./rate-limit.ts";

/** Value of the X-Requested-With header that every state-changing request must carry. */
export const CSRF_HEADER_VALUE = "mips-distribution";

/** Paths reached by providers and gate readers, which sign their requests instead. */
const SIGNED_PATH_PREFIXES = ["/api/webhooks/", "/api/access/"];
/** Paths open without the access code: signed callbacks, public links, and the gate itself. */
const GATE_EXEMPT_PREFIXES = ["/api/webhooks/", "/api/access/", "/api/public/", "/api/gate"];

/** API errors keep their status and code; invalid input is a 400; anything else a generic 500. */
export const errorHandler: ErrorHandler<AppEnv> = (error, c) => {
  if (error instanceof ApiError) {
    return c.json({ error: { code: error.code, message: error.message } }, error.status as ContentfulStatusCode);
  }
  if (error instanceof z.ZodError) {
    const details = error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join(" ; ");
    return c.json({ error: { code: "invalid_input", message: "Données invalides : " + details } }, 400);
  }
  console.error("Erreur interne :", error instanceof Error ? error.message : "inconnue");
  return c.json({ error: { code: "internal", message: "Une erreur est survenue. Réessayez." } }, 500);
};

/**
 * Browsers cannot send a custom header cross-site without a preflight, so requiring it on every
 * state-changing request blocks CSRF. API responses are never cached.
 */
export const csrfAndNoStore: MiddlewareHandler<AppEnv> = async (c, next) => {
  const method = c.req.method;
  if (
    method !== "GET" &&
    method !== "HEAD" &&
    !SIGNED_PATH_PREFIXES.some((prefix) => c.req.path.startsWith(prefix)) &&
    c.req.header("X-Requested-With") !== CSRF_HEADER_VALUE
  ) {
    throw new ApiError(403, "csrf", "Requête refusée.");
  }
  c.header("Cache-Control", "no-store");
  await next();
};

/** When an access code is configured, the API requires a signed `md_gate` cookie obtained with it. */
export function registerAccessGate(app: App, { config, session, rateLimit, now }: AppDeps): void {
  app.use("/api/*", async (c, next) => {
    if (!GATE_EXEMPT_PREFIXES.some((prefix) => c.req.path.startsWith(prefix)) && !session.verify(getCookie(c, GATE_COOKIE))) {
      throw new ApiError(401, "gate", "Code d'accès requis.");
    }
    await next();
  });

  app.post("/api/gate", async (c) => {
    rateLimit(`gate:${clientKey(c)}`, 5, ONE_MINUTE_MS);
    const { code } = await readJson(c, z.object({ code: z.string().max(200) }));
    // Compare fixed-length digests so the comparison takes constant time whatever the input length.
    const digest = (value: string): Buffer => createHmac("sha256", config.sessionSecret).update(value).digest();
    if (!timingSafeEqual(digest(code), digest(config.accessCode))) throw new ApiError(401, "bad_code", "Code incorrect.");
    setCookie(c, GATE_COOKIE, session.sign({ gate: true, exp: now().getTime() + COOKIE_LIFETIME_SECONDS * 1000 }), {
      httpOnly: true,
      sameSite: "Lax",
      secure: c.req.header("x-forwarded-proto") === "https",
      path: "/",
      maxAge: COOKIE_LIFETIME_SECONDS,
    });
    return c.json({ ok: true });
  });
}
