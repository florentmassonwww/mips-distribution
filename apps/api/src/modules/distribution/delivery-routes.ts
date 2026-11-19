// Delivery routes ("tournées", table `routes`): planning, stops, vehicle loading and summaries.
// Lifecycle: planned → loaded (by the warehouse) → in_progress (by the agent) → closed.
import { z } from "zod";
import { type Db, all, get, run, transaction } from "../../core/db.ts";
import { newId } from "../../core/ids.ts";
import { iso } from "../../core/time.ts";
import { recordAudit } from "../../core/audit.ts";
import { ApiError, notFound } from "../../core/errors.ts";
import type { Actor } from "../../core/actor.ts";
import { requireCompanyId } from "./access.ts";
import { requireActiveCustomer } from "./catalog.ts";
import { recordStockMovement } from "./stock.ts";

export type RouteStatus = "planned" | "loaded" | "in_progress" | "closed";

export interface RouteRow {
  id: string;
  company_id: string;
  name: string;
  day: string;
  agent_id: string | null;
  vehicle: string;
  status: RouteStatus;
  started_at: string | null;
  closed_at: string | null;
  created_at: string;
}

export const createRouteInput = z.object({
  name: z.string().min(2).max(80),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  agentId: z.string().nullish(),
  vehicle: z.string().max(40).default(""),
  customerIds: z.array(z.string()).max(200).default([]),
});
export type CreateRouteInput = z.output<typeof createRouteInput>;
export type UpdateRouteInput = Partial<CreateRouteInput>;

/** Extra products loaded for on-the-spot sales, on top of the prepared orders. */
export interface LoadExtra {
  productId: string;
  qty: number;
}

/** A route of the company, or 404. */
export function requireRoute(db: Db, companyId: string, routeId: string): RouteRow {
  const route = get<RouteRow>(db, "SELECT * FROM routes WHERE id = ? AND company_id = ?", routeId, companyId);
  if (!route) throw notFound("Tournée");
  return route;
}

/** Adds a customer as the last stop of a route; a customer already on the route keeps its place. */
export function addRouteStop(db: Db, companyId: string, routeId: string, customerId: string): void {
  const { n: seq } = get<{ n: number }>(db, "SELECT COALESCE(MAX(seq), 0) + 1 AS n FROM route_stops WHERE route_id = ?", routeId)!;
  // The identifier is drawn even when the stop already exists (INSERT OR IGNORE).
  run(
    db,
    "INSERT OR IGNORE INTO route_stops (id, route_id, company_id, customer_id, seq) VALUES (?,?,?,?,?)",
    newId("stp"),
    routeId,
    companyId,
    customerId,
    seq,
  );
}

/** Checks that `agentId` is an active agent of the company; no agent gives null. */
function requireAgentOrNone(db: Db, companyId: string, agentId: string | null | undefined): string | null {
  if (!agentId) return null;
  if (!get(db, "SELECT 1 FROM users WHERE id = ? AND company_id = ? AND role = 'agent' AND active = 1", agentId, companyId)) {
    throw notFound("Agent");
  }
  return agentId;
}

export function createRoute(db: Db, actor: Actor, input: CreateRouteInput, now: Date = new Date()): { id: string } {
  const companyId = requireCompanyId(actor);
  return transaction(db, () => {
    const routeId = newId("rte");
    run(
      db,
      "INSERT INTO routes (id, company_id, name, day, agent_id, vehicle, created_at) VALUES (?,?,?,?,?,?,?)",
      routeId,
      companyId,
      input.name,
      input.day,
      requireAgentOrNone(db, companyId, input.agentId),
      input.vehicle,
      iso(now),
    );
    for (const customerId of input.customerIds) {
      requireActiveCustomer(db, companyId, customerId);
      addRouteStop(db, companyId, routeId, customerId);
    }
    recordAudit(db, actor, "route.created", "route", routeId, { name: input.name, day: input.day }, companyId, now);
    return { id: routeId };
  });
}

export function updateRoute(db: Db, actor: Actor, routeId: string, input: UpdateRouteInput, now: Date = new Date()): void {
  const companyId = requireCompanyId(actor);
  transaction(db, () => {
    const route = requireRoute(db, companyId, routeId);
    if (route.status === "closed") throw new ApiError(409, "route_locked", "Tournée clôturée.");
    if (input.agentId !== undefined) {
      if (route.status === "in_progress") throw new ApiError(409, "route_locked", "L'agent ne peut pas être changé pendant la tournée.");
      run(db, "UPDATE routes SET agent_id = ? WHERE id = ?", requireAgentOrNone(db, companyId, input.agentId), routeId);
    }
    if (input.name) run(db, "UPDATE routes SET name = ? WHERE id = ?", input.name, routeId);
    if (input.vehicle !== undefined) run(db, "UPDATE routes SET vehicle = ? WHERE id = ?", input.vehicle, routeId);
    if (input.customerIds) replaceRouteStops(db, companyId, routeId, input.customerIds);
    recordAudit(db, actor, "route.updated", "route", routeId, { name: route.name, fields: Object.keys(input) }, companyId, now);
  });
}

/**
 * Renumbers the stops from the requested customer list. Customers that still have an order on the
 * route stay on it (appended after the requested ones) so that no order loses its stop.
 */
function replaceRouteStops(db: Db, companyId: string, routeId: string, customerIds: string[]): void {
  const withOrders = new Set(
    all<{ customer_id: string }>(
      db,
      "SELECT DISTINCT customer_id FROM orders WHERE route_id = ? AND status != 'cancelled'",
      routeId,
    ).map((row) => row.customer_id),
  );
  for (const customerId of customerIds) requireActiveCustomer(db, companyId, customerId);
  const stops = [...new Set([...customerIds, ...withOrders])];
  run(db, "DELETE FROM route_stops WHERE route_id = ?", routeId);
  stops.forEach((customerId, index) =>
    run(
      db,
      "INSERT INTO route_stops (id, route_id, company_id, customer_id, seq) VALUES (?,?,?,?,?)",
      newId("stp"),
      routeId,
      companyId,
      customerId,
      index + 1,
    ),
  );
}

/**
 * Loads the vehicle: moves the prepared orders' quantities plus the extras from the warehouse to
 * the vehicle. Every order of the route must be prepared first.
 */
export function loadRoute(db: Db, actor: Actor, routeId: string, extras: LoadExtra[], now: Date = new Date()): void {
  const companyId = requireCompanyId(actor);
  transaction(db, () => {
    const route = requireRoute(db, companyId, routeId);
    if (route.status !== "planned") throw new ApiError(409, "bad_status", "Cette tournée est déjà chargée.");
    if (!route.agent_id) throw new ApiError(409, "no_agent", "Affectez un agent avant de charger le véhicule.");
    const unprepared = all<{ number: string }>(db, "SELECT number FROM orders WHERE route_id = ? AND status = 'confirmed'", routeId);
    if (unprepared.length) {
      throw new ApiError(
        409,
        "orders_not_prepared",
        `Commandes à préparer avant le chargement : ${unprepared.map((order) => order.number).join(", ")}.`,
      );
    }

    // Quantity to load per product, in this order: prepared orders first, then the extras.
    const toLoad = new Map<string, number>();
    for (const row of all<{ product_id: string; q: number }>(
      db,
      `SELECT l.product_id, SUM(l.qty_ordered) AS q FROM order_lines l JOIN orders o ON o.id = l.order_id
      WHERE o.route_id = ? AND o.status = 'prepared' GROUP BY l.product_id`,
      routeId,
    )) {
      toLoad.set(row.product_id, row.q);
    }
    for (const extra of extras) {
      if (extra.qty > 0) toLoad.set(extra.productId, (toLoad.get(extra.productId) ?? 0) + extra.qty);
    }
    if (!toLoad.size) throw new ApiError(409, "nothing_to_load", "Rien à charger : ajoutez des commandes préparées ou du stock de vente.");

    for (const [productId, qty] of toLoad) {
      const product = get<{ name: string; qty: number | null }>(
        db,
        `SELECT p.name, w.qty FROM products p LEFT JOIN warehouse_stock w ON w.product_id = p.id AND w.company_id = p.company_id
        WHERE p.id = ? AND p.company_id = ?`,
        productId,
        companyId,
      );
      if (!product) throw notFound("Produit");
      const available = product.qty ?? 0;
      if (available < qty) {
        throw new ApiError(
          409,
          "insufficient_stock",
          `Stock dépôt insuffisant pour ${product.name} : ${available} disponible(s), ${qty} demandé(s).`,
        );
      }
      run(db, "UPDATE warehouse_stock SET qty = qty - ? WHERE company_id = ? AND product_id = ?", qty, companyId, productId);
      run(
        db,
        "INSERT INTO vehicle_stock (route_id, product_id, company_id, loaded_qty, qty) VALUES (?,?,?,?,?)",
        routeId,
        productId,
        companyId,
        qty,
        qty,
      );
      recordStockMovement(db, companyId, productId, routeId, "load", -qty, route.name, actor.id, now);
    }

    run(db, "UPDATE orders SET status = 'loaded' WHERE route_id = ? AND status = 'prepared'", routeId);
    run(db, "UPDATE routes SET status = 'loaded' WHERE id = ?", routeId);
    recordAudit(db, actor, "route.loaded", "route", routeId, { name: route.name, products: toLoad.size }, companyId, now);
  });
}

/** Routes of the company (or of one agent) with their progress and amounts, latest day first. */
export function listRoutes(db: Db, companyId: string, agentId?: string) {
  return all<RouteRow & { agent: string | null; stops: number; orders_total: number; orders_done: number; invoiced_minor: number; paid_minor: number }>(
    db,
    `SELECT r.*, u.name AS agent,
      (SELECT COUNT(*) FROM route_stops WHERE route_id = r.id) AS stops,
      (SELECT COUNT(*) FROM orders WHERE route_id = r.id AND kind = 'preorder' AND status != 'cancelled') AS orders_total,
      (SELECT COUNT(*) FROM orders WHERE route_id = r.id AND kind = 'preorder' AND status IN ('delivered','partially_delivered','refused')) AS orders_done,
      (SELECT COALESCE(SUM(amount_minor), 0) FROM invoices WHERE route_id = r.id) AS invoiced_minor,
      (SELECT COALESCE(SUM(paid_minor - refunded_minor), 0) FROM invoices WHERE route_id = r.id) AS paid_minor
    FROM routes r LEFT JOIN users u ON u.id = r.agent_id WHERE r.company_id = ? ${agentId ? "AND r.agent_id = ?" : ""} ORDER BY r.day DESC, r.name LIMIT 100`,
    companyId,
    ...(agentId ? [agentId] : []),
  );
}

/** Orders, money and vehicle stock of one route. */
export function routeSummary(db: Db, companyId: string, routeId: string) {
  const route = get<RouteRow & { agent: string | null }>(
    db,
    "SELECT r.*, u.name AS agent FROM routes r LEFT JOIN users u ON u.id = r.agent_id WHERE r.id = ? AND r.company_id = ?",
    routeId,
    companyId,
  );
  if (!route) throw notFound("Tournée");
  const count = (sql: string): number => get<{ n: number }>(db, sql, routeId)!.n;
  return {
    route,
    orders: {
      total: count("SELECT COUNT(*) AS n FROM orders WHERE route_id = ? AND kind = 'preorder' AND status != 'cancelled'"),
      toDeliver: count("SELECT COUNT(*) AS n FROM orders WHERE route_id = ? AND status IN ('prepared','loaded','confirmed')"),
      delivered: count("SELECT COUNT(*) AS n FROM orders WHERE route_id = ? AND kind = 'preorder' AND status = 'delivered'"),
      partial: count("SELECT COUNT(*) AS n FROM orders WHERE route_id = ? AND status = 'partially_delivered'"),
      refused: count("SELECT COUNT(*) AS n FROM orders WHERE route_id = ? AND status = 'refused'"),
      routeSales: count("SELECT COUNT(*) AS n FROM orders WHERE route_id = ? AND kind = 'route_sale'"),
    },
    money: {
      invoiced: count("SELECT COALESCE(SUM(amount_minor), 0) AS n FROM invoices WHERE route_id = ?"),
      confirmed: count("SELECT COALESCE(SUM(paid_minor - refunded_minor), 0) AS n FROM invoices WHERE route_id = ?"),
      pending: count(
        "SELECT COALESCE(SUM(p.amount_minor), 0) AS n FROM payments p JOIN invoices i ON i.id = p.invoice_id WHERE i.route_id = ? AND p.status = 'pending'",
      ),
      toVerify: count(
        "SELECT COALESCE(SUM(p.amount_minor), 0) AS n FROM payments p JOIN invoices i ON i.id = p.invoice_id WHERE i.route_id = ? AND p.status = 'to_verify'",
      ),
      settled: count(
        "SELECT COALESCE(SUM(p.amount_minor - p.refunded_minor), 0) AS n FROM payments p JOIN invoices i ON i.id = p.invoice_id WHERE i.route_id = ? AND p.settlement_status = 'settled'",
      ),
    },
    byMethod: all(
      db,
      `SELECT p.method, COUNT(*) AS count, SUM(p.amount_minor - p.refunded_minor) AS amount_minor FROM payments p JOIN invoices i ON i.id = p.invoice_id
      WHERE i.route_id = ? AND p.status IN ('confirmed','refunded') GROUP BY p.method`,
      routeId,
    ),
    stock: all(
      db,
      "SELECT v.product_id, p.name, p.sku, p.unit, v.loaded_qty, v.qty, v.returned_qty FROM vehicle_stock v JOIN products p ON p.id = v.product_id WHERE v.route_id = ? ORDER BY p.name",
      routeId,
    ),
  };
}
