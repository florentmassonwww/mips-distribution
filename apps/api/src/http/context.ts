// Types and small request helpers shared by the HTTP layer.
import type { Context, Hono } from "hono";
import { z } from "zod";
import type { Db } from "../core/db.ts";
import type { SessionUser } from "../core/actor.ts";
import { type Connectors, type PaymentMethod, PAYMENT_METHODS } from "./legacy-modules.ts";
import type { SessionTools } from "./session.ts";
import type { RateLimiter } from "./rate-limit.ts";

export interface AppConfig {
  /** Demo mode: one-click demo logins, demo reset and simulated payment outcomes are exposed. */
  demoMode: boolean;
  /** Secret signing the session and access-gate cookies. */
  sessionSecret: string;
  /** Secret of the simulated providers' (and gate readers') signed notifications. */
  webhookSecret: string;
  webhookToleranceSeconds: number;
  /** Access code gating the whole API; "" disables the gate. */
  accessCode: string;
  dbPath: string;
  port: number;
}

export type AppEnv = { Variables: { user: SessionUser } };
export type App = Hono<AppEnv>;
export type RequestContext = Context<AppEnv>;

/** Everything a router needs, built once per application. */
export interface AppDeps {
  db: Db;
  config: AppConfig;
  connectors: Connectors;
  now: () => Date;
  session: SessionTools;
  rateLimit: RateLimiter;
  /** Pushes pending ERP entries when the company has automatic sync enabled. */
  syncErpIfAuto: (companyId: string | null | undefined) => Promise<void>;
}

/** Parses the JSON body with `schema`; an unreadable body is validated as `{}`. */
export async function readJson<S extends z.ZodType>(c: Context, schema: S): Promise<z.output<S>> {
  return schema.parse(await c.req.json().catch(() => ({})));
}

/** Path parameter (`id` by default). */
export const routeParam = (c: Context, name = "id"): string => c.req.param(name) ?? "";

/** Company of the signed-in user (routes using it are guarded by company roles). */
export const companyOf = (c: RequestContext): string => c.get("user").companyId as string;

/** Origin used to build links sent to customers and members. */
export const requestOrigin = (c: Context): string => c.req.header("origin") ?? new URL(c.req.url).origin;

/** Client key for per-client rate limits. */
export const clientKey = (c: Context): string => c.req.header("x-forwarded-for") ?? "local";

/** Optional query filter: an empty value means "no filter". */
export const queryFilter = (c: Context, name: string): string | undefined => c.req.query(name) || undefined;

/** One of the payment methods the platform supports. */
export const paymentMethodSchema = z.enum(PAYMENT_METHODS as [PaymentMethod, ...PaymentMethod[]]);
