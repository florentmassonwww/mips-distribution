// Hono application: middleware, then every /api route.
//
// Hono matches middleware and handlers in registration order, so the order of the calls below is
// part of the behaviour: the CSRF/no-store and access-gate middleware come first, the
// distribution-only guards come before the routes they protect, and the /api/* catch-all is last.
import { Hono } from "hono";
import type { Db } from "../core/db.ts";
import { notFound } from "../core/errors.ts";
import { companySettings, syncErp, type Connectors } from "./legacy-modules.ts";
import type { AppConfig, AppDeps, AppEnv } from "./context.ts";
import { csrfAndNoStore, errorHandler, registerAccessGate } from "./middleware.ts";
import { createSessionTools } from "./session.ts";
import { createRateLimiter } from "./rate-limit.ts";
import { registerSessionRoutes } from "./session-routes.ts";
import { registerDemoRoutes } from "./demo-routes.ts";
import { registerPublicMemberRoutes, registerPublicPaymentRoutes } from "./public-routes.ts";
import { registerAgentRoutes } from "./agent-routes.ts";
import { registerPaymentRoutes } from "./payment-routes.ts";
import { registerCentraleRoutes } from "./centrale-routes.ts";
import { registerExceptionRoutes } from "./exception-routes.ts";
import { registerFinanceRoutes } from "./finance-routes.ts";
import { registerClubRoutes } from "./club-routes.ts";
import { registerAdminRoutes } from "./admin-routes.ts";
import { registerPlatformRoutes } from "./platform-routes.ts";

export type { AppConfig } from "./context.ts";

/** Areas reserved to distribution companies: club users get 403 `wrong_vertical` there. */
const DISTRIBUTION_PATHS = [
  "/api/agent/*",
  "/api/centrale/*",
  "/api/payments",
  "/api/payments/*",
  "/api/chain/*",
  "/api/invoices/*",
  "/api/finance/journal",
  "/api/finance/invoices",
  "/api/finance/reconciliation",
  "/api/finance/statements",
  "/api/finance/statements/*",
  "/api/finance/close",
  "/api/finance/payments/*",
];

export function createApp(db: Db, config: AppConfig, connectors: Connectors, now: () => Date = () => new Date()): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  const deps: AppDeps = {
    db,
    config,
    connectors,
    now,
    session: createSessionTools(db, config, now),
    rateLimit: createRateLimiter(now),
    syncErpIfAuto: async (companyId) => {
      if (companyId && companySettings(db, companyId).erp.autoSync) await syncErp(db, connectors, companyId, {}, undefined, now());
    },
  };

  app.onError(errorHandler);
  app.use("/api/*", csrfAndNoStore);
  if (config.accessCode) registerAccessGate(app, deps);

  registerSessionRoutes(app, deps);
  if (config.demoMode) registerDemoRoutes(app, deps);
  registerPublicPaymentRoutes(app, deps);

  for (const path of DISTRIBUTION_PATHS) app.use(path, deps.session.distributionOnly);
  registerAgentRoutes(app, deps);
  registerPaymentRoutes(app, deps);
  registerCentraleRoutes(app, deps);
  registerExceptionRoutes(app, deps);
  registerFinanceRoutes(app, deps);

  registerClubRoutes(app, deps);
  registerPublicMemberRoutes(app, deps);

  registerAdminRoutes(app, deps);
  registerPlatformRoutes(app, deps);

  app.all("/api/*", () => {
    throw notFound("Ressource");
  });
  return app;
}
