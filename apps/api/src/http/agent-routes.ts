// Delivery agents' mobile app: their routes, the offline bundle, and action sync.
import { z } from "zod";
import { applySyncAction, closeRoute, routeBundle, startRoute, syncActionInput as syncActionSchema } from "../modules/distribution/agent-sync.ts";
import { listRoutes, routeSummary } from "../modules/distribution/delivery-routes.ts";
import { PAYMENT_METHODS, readCompanySettings as companySettings } from "../modules/distribution/settings.ts";
import { type App, type AppDeps, companyOf, readJson, routeParam } from "./context.ts";

export function registerAgentRoutes(app: App, deps: AppDeps): void {
  const { db, connectors, session, now, syncErpIfAuto } = deps;
  const agentOnly = session.requireRole("agent");

  app.get("/api/agent/routes", agentOnly, (c) => c.json(listRoutes(db, companyOf(c), c.get("user").id)));

  app.post("/api/agent/routes/:id/start", agentOnly, (c) => {
    startRoute(db, c.get("user"), routeParam(c), now());
    return c.json({ ok: true });
  });

  // Everything the app needs to work offline on the route, with the enabled payment methods.
  app.get("/api/agent/routes/:id/bundle", agentOnly, (c) => {
    const methods = companySettings(db, companyOf(c)).payments.methods;
    return c.json({
      ...routeBundle(db, c.get("user"), routeParam(c), now()),
      methods: PAYMENT_METHODS.filter((method) => methods[method].enabled).map((method) => ({
        method,
        label: connectors.payments[method].label,
      })),
    });
  });

  app.get("/api/agent/routes/:id/summary", agentOnly, (c) => {
    // Called for its access check only (the agent must own the route); keeps the default clock.
    routeBundle(db, c.get("user"), routeParam(c));
    return c.json(routeSummary(db, companyOf(c), routeParam(c)));
  });

  app.post("/api/agent/routes/:id/close", agentOnly, (c) => c.json(closeRoute(db, c.get("user"), routeParam(c), now())));

  app.post("/api/agent/sync", agentOnly, async (c) => {
    const { actions } = await readJson(c, z.object({ actions: z.array(syncActionSchema).max(100) }));
    const results = actions.map((action) => applySyncAction(db, c.get("user"), action, now()));
    await syncErpIfAuto(companyOf(c));
    return c.json({ results });
  });
}
