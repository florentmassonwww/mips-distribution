// Dispatch office ("centrale"): orders, routes, loading and warehouse stock.
import { z } from "zod";
import { all } from "../core/db.ts";
import { dashboard as centraleDashboard } from "../modules/distribution/dashboard.ts";
import { createRoute, createRouteInput as routeInputSchema, listRoutes, loadRoute, routeSummary, updateRoute } from "../modules/distribution/delivery-routes.ts";
import { assignOrder, createOrder, createOrderInput as orderInputSchema, listOrders, orderChain, setOrderStatus } from "../modules/distribution/orders.ts";
import { OPS_ROLES } from "../modules/distribution/settings.ts";
import { adjustStock, readStock as stockLevels } from "../modules/distribution/stock.ts";
import { type App, type AppDeps, companyOf, queryFilter, readJson, routeParam } from "./context.ts";

export function registerCentraleRoutes(app: App, deps: AppDeps): void {
  const { db, session, now } = deps;
  /** Who may change orders, routes and stock. */
  const operators = session.requireRole(...OPS_ROLES);
  /** Who may look at operations. */
  const viewers = session.requireRole("company_admin", "dispatcher", "finance");

  app.get("/api/centrale/dashboard", viewers, (c) => c.json(centraleDashboard(db, companyOf(c), now())));

  app.get("/api/centrale/reference", viewers, (c) =>
    c.json({
      customers: all(
        db,
        "SELECT c.id, c.code, c.name, c.zone, c.address, pl.name AS price_list FROM customers c LEFT JOIN price_lists pl ON pl.id = c.price_list_id WHERE c.company_id = ? AND c.active = 1 ORDER BY c.name",
        companyOf(c),
      ),
      products: all(
        db,
        "SELECT p.id, p.sku, p.name, p.unit, p.price_minor, COALESCE(w.qty, 0) AS qty FROM products p LEFT JOIN warehouse_stock w ON w.product_id = p.id AND w.company_id = p.company_id WHERE p.company_id = ? AND p.active = 1 ORDER BY p.name",
        companyOf(c),
      ),
      agents: all(db, "SELECT id, name FROM users WHERE company_id = ? AND role = 'agent' AND active = 1 ORDER BY name", companyOf(c)),
    }),
  );

  app.get("/api/centrale/orders", viewers, (c) =>
    c.json(listOrders(db, companyOf(c), { status: queryFilter(c, "status"), routeId: queryFilter(c, "routeId") })),
  );

  app.post("/api/centrale/orders", operators, async (c) =>
    c.json(createOrder(db, c.get("user"), await readJson(c, orderInputSchema), now())),
  );

  // Order-to-cash chain of an order: delivery, invoice, payments, settlement, ERP.
  app.get("/api/chain/:id", viewers, (c) => c.json(orderChain(db, companyOf(c), routeParam(c))));

  app.post("/api/centrale/orders/:id/assign", operators, async (c) => {
    const { routeId } = await readJson(c, z.object({ routeId: z.string().nullable() }));
    assignOrder(db, c.get("user"), routeParam(c), routeId, now());
    return c.json({ ok: true });
  });

  app.post("/api/centrale/orders/:id/status", operators, async (c) => {
    const { status } = await readJson(c, z.object({ status: z.enum(["prepared", "confirmed", "cancelled"]) }));
    setOrderStatus(db, c.get("user"), routeParam(c), status, now());
    return c.json({ ok: true });
  });

  app.get("/api/centrale/routes", viewers, (c) => c.json(listRoutes(db, companyOf(c))));

  app.post("/api/centrale/routes", operators, async (c) =>
    c.json(createRoute(db, c.get("user"), await readJson(c, routeInputSchema), now())),
  );

  app.get("/api/centrale/routes/:id", viewers, (c) =>
    c.json({
      ...routeSummary(db, companyOf(c), routeParam(c)),
      stops: all(
        db,
        "SELECT s.customer_id, s.seq, c.name, c.zone FROM route_stops s JOIN customers c ON c.id = s.customer_id WHERE s.route_id = ? AND s.company_id = ? ORDER BY s.seq",
        routeParam(c),
        companyOf(c),
      ),
      orderList: listOrders(db, companyOf(c), { routeId: routeParam(c) }),
    }),
  );

  app.patch("/api/centrale/routes/:id", operators, async (c) => {
    updateRoute(db, c.get("user"), routeParam(c), await readJson(c, routeInputSchema.partial()), now());
    return c.json({ ok: true });
  });

  // Extra stock loaded on the vehicle for on-the-spot sales.
  app.post("/api/centrale/routes/:id/load", operators, async (c) => {
    const { extras } = await readJson(
      c,
      z.object({
        extras: z
          .array(z.object({ productId: z.string(), qty: z.number().int().min(0).max(1e5) }))
          .max(200)
          .default([]),
      }),
    );
    loadRoute(db, c.get("user"), routeParam(c), extras, now());
    return c.json({ ok: true });
  });

  app.get("/api/centrale/stock", viewers, (c) => c.json(stockLevels(db, companyOf(c))));

  app.post("/api/centrale/stock/adjust", operators, async (c) => {
    const adjustment = await readJson(
      c,
      z.object({
        productId: z.string(),
        delta: z
          .number()
          .int()
          .min(-1e5)
          .max(1e5)
          .refine((delta) => delta !== 0),
        reason: z.string().min(3).max(200),
      }),
    );
    adjustStock(db, c.get("user"), adjustment.productId, adjustment.delta, adjustment.reason, now());
    return c.json({ ok: true });
  });
}
