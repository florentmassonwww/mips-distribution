// Signed cookies, the signed-in user, and the role and module guards.
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Context, MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { type Db, get } from "../core/db.ts";
import type { Role, SessionUser } from "../core/actor.ts";
import { ApiError, forbidden } from "../core/errors.ts";
import { MODULE_NOT_ENABLED_MESSAGES, type ModuleCode, companyModules } from "../core/modules.ts";
import type { AppConfig, AppEnv } from "./context.ts";

export const SESSION_COOKIE = "md_session";
export const GATE_COOKIE = "md_gate";
/** Lifetime of the session and access-gate cookies: 12 hours. */
export const COOKIE_LIFETIME_SECONDS = 43200;

/** Every role of a company's staff (the platform team excluded). */
export const COMPANY_ROLES: Role[] = ["company_admin", "dispatcher", "finance", "agent"];

/** Payload of a signed cookie: a session (`uid`) or a passed access gate (`gate`). */
export interface SignedPayload {
  uid?: string;
  gate?: boolean;
  /** Expiry, in milliseconds since the epoch. */
  exp: number;
}

export interface SessionTools {
  /** `base64url(JSON payload)` + "." + `base64url(HMAC-SHA256)`. */
  sign(payload: SignedPayload): string;
  /** The payload of a well-signed, unexpired token, else null. */
  verify(token: string | undefined): SignedPayload | null;
  /** The active user of the session cookie, else null. */
  currentUser(c: Context): SessionUser | null;
  /** Requires a signed-in user with one of the roles, of a company that is not suspended. */
  requireRole(...roles: Role[]): MiddlewareHandler<AppEnv>;
  /**
   * Refuses a signed-in company user whose company has not enabled the module (403
   * `module_not_enabled`). Requires no authentication by itself: anonymous and platform users go
   * through, and the route's role guard decides for them.
   */
  requireModule(module: ModuleCode): MiddlewareHandler<AppEnv>;
  /** requireRole, then requireModule: roles and suspension are checked before the module. */
  requireModuleRole(module: ModuleCode, ...roles: Role[]): MiddlewareHandler<AppEnv>;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  company_id: string | null;
  company_name: string | null;
  company_status: string | null;
}

export function createSessionTools(db: Db, config: AppConfig, now: () => Date): SessionTools {
  const mac = (data: string): string => createHmac("sha256", config.sessionSecret).update(data).digest("base64url");

  const sign = (payload: SignedPayload): string => {
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${body}.${mac(body)}`;
  };

  const verify = (token: string | undefined): SignedPayload | null => {
    const [body, signature] = (token ?? "").split(".");
    if (!body || !signature) return null;
    const expected = Buffer.from(mac(body));
    const given = Buffer.from(signature);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    try {
      const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SignedPayload;
      return payload.exp > now().getTime() ? payload : null;
    } catch {
      return null;
    }
  };

  const currentUser = (c: Context): SessionUser | null => {
    const payload = verify(getCookie(c, SESSION_COOKIE));
    if (!payload) return null;
    const row = get<UserRow>(
      db,
      "SELECT u.*, c.name AS company_name, c.status AS company_status FROM users u LEFT JOIN companies c ON c.id = u.company_id WHERE u.id = ? AND u.active = 1",
      payload.uid as string,
    );
    return row
      ? {
          id: row.id,
          name: row.name,
          email: row.email,
          role: row.role,
          companyId: row.company_id,
          companyName: row.company_name,
          companyStatus: row.company_status,
          modules: companyModules(db, row.company_id),
        }
      : null;
  };

  const requireRole =
    (...roles: Role[]): MiddlewareHandler<AppEnv> =>
    async (c, next) => {
      const user = currentUser(c);
      if (!user) throw new ApiError(401, "unauthenticated", "Connexion requise.");
      if (!roles.includes(user.role)) throw forbidden();
      if (user.companyId && user.companyStatus !== "active") {
        throw new ApiError(403, "company_suspended", "L'accès de cette entreprise est suspendu.");
      }
      c.set("user", user);
      await next();
    };

  const moduleNotEnabled = (module: ModuleCode): ApiError =>
    new ApiError(403, "module_not_enabled", MODULE_NOT_ENABLED_MESSAGES[module]);

  const requireModule =
    (module: ModuleCode): MiddlewareHandler<AppEnv> =>
    async (c, next) => {
      const user = c.get("user") ?? currentUser(c);
      if (user?.companyId && !user.modules.includes(module)) throw moduleNotEnabled(module);
      await next();
    };

  const requireModuleRole =
    (module: ModuleCode, ...roles: Role[]): MiddlewareHandler<AppEnv> =>
    async (c, next) => {
      await requireRole(...roles)(c, async () => {
        await requireModule(module)(c, next);
      });
    };

  return { sign, verify, currentUser, requireRole, requireModule, requireModuleRole };
}
