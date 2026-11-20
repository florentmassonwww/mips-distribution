// Pre-orders taken by the head office ("centrale"): creation, route assignment, preparation status,
// listing and the full document chain (order → delivery → invoice → payments → ERP).
import { z } from "zod";
import { type Db, type Row, all, get, run, transaction } from "../../core/db.ts";
import { newId } from "../../core/ids.ts";
import { iso } from "../../core/time.ts";
import { recordAudit } from "../../core/audit.ts";
import { ApiError, notFound } from "../../core/errors.ts";
import type { Actor } from "../../core/actor.ts";
import { requireCompanyId } from "./access.ts";
import { customerPrices, requireActiveCustomer } from "./catalog.ts";
import { nextNumber } from "./counters.ts";
import { addRouteStop, requireRoute } from "./delivery-routes.ts";

export type OrderKind = "preorder" | "route_sale";
export type OrderStatus = "confirmed" | "prepared" | "loaded" | "delivered" | "partially_delivered" | "refused" | "cancelled";

export interface OrderRow {
  id: string;
  company_id: string;
  number: string;
  customer_id: string;
  route_id: string | null;
  kind: OrderKind;
  status: OrderStatus;
  note?: string;
  created_by?: string;
  created_at?: string;
  delivered_at?: string | null;
}

export const createOrderInput = z.object({
  customerId: z.string(),
  routeId: z.string().nullish(),
  note: z.string().max(300).default(""),
  lines: z
    .array(z.object({ productId: z.string(), qty: z.number().int().min(1).max(100000) }))
    .min(1)
    .max(100),
});
export type CreateOrderInput = z.output<typeof createOrderInput>;

/** Status changes the head office may request on a pre-order. */
export type OrderStatusChange = "prepared" | "confirmed" | "cancelled";

/** An order of the company, or 404. */
export function requireOrder(db: Db, companyId: string, orderId: string): OrderRow {
  const order = get<OrderRow>(db, "SELECT * FROM orders WHERE id = ? AND company_id = ?", orderId, companyId);
  if (!order) throw notFound("Commande");
  return order;
}

/** Creates a confirmed pre-order priced with the customer's prices, optionally assigned to a route. */
export function createOrder(db: Db, actor: Actor, input: CreateOrderInput, now: Date = new Date()): { id: string; number: string } {
  const companyId = requireCompanyId(actor);
  return transaction(db, () => {
    requireActiveCustomer(db, companyId, input.customerId);
    const prices = customerPrices(db, companyId, input.customerId);
    const orderId = newId("ord");
    const number = nextNumber(db, companyId, "order", "CMD");
    run(
      db,
      "INSERT INTO orders (id, company_id, number, customer_id, kind, status, note, created_by, created_at) VALUES (?,?,?,?,'preorder','confirmed',?,?,?)",
      orderId,
      companyId,
      number,
      input.customerId,
      input.note,
      actor.id,
      iso(now),
    );
    for (const line of input.lines) {
      const unitPrice = prices.get(line.productId);
      if (unitPrice === undefined) throw notFound("Produit");
      run(
        db,
        "INSERT INTO order_lines (id, order_id, company_id, product_id, qty_ordered, unit_price_minor) VALUES (?,?,?,?,?,?)",
        newId("ol"),
        orderId,
        companyId,
        line.productId,
        line.qty,
        unitPrice,
      );
    }
    recordAudit(db, actor, "order.created", "order", orderId, { number, lines: input.lines.length }, companyId, now);
    if (input.routeId) assignOrder(db, actor, orderId, input.routeId, now);
    return { id: orderId, number };
  });
}

/**
 * Moves a pre-order to another route (or off any route with null). Only possible while both the
 * current and the target route are still planned: a loaded vehicle cannot change.
 */
export function assignOrder(db: Db, actor: Actor, orderId: string, routeId: string | null, now: Date = new Date()): void {
  const companyId = requireCompanyId(actor);
  transaction(db, () => {
    const order = requireOrder(db, companyId, orderId);
    if (order.kind !== "preorder" || !["confirmed", "prepared"].includes(order.status)) {
      throw new ApiError(409, "bad_status", "Cette commande ne peut plus être réaffectée.");
    }
    if (order.route_id && requireRoute(db, companyId, order.route_id).status !== "planned") {
      throw new ApiError(409, "route_locked", "La tournée actuelle de cette commande est déjà chargée.");
    }
    if (routeId) {
      if (requireRoute(db, companyId, routeId).status !== "planned") {
        throw new ApiError(409, "route_locked", "Cette tournée est déjà chargée : affectez la commande à une tournée planifiée.");
      }
      addRouteStop(db, companyId, routeId, order.customer_id);
    }
    run(db, "UPDATE orders SET route_id = ? WHERE id = ?", routeId, orderId);
    recordAudit(db, actor, "order.assigned", "order", orderId, { number: order.number, routeId }, companyId, now);
  });
}

/** Statuses from which each change is allowed. */
function allowedSources(status: OrderStatusChange): OrderStatus[] {
  if (status === "prepared") return ["confirmed"];
  if (status === "confirmed") return ["prepared"];
  return ["confirmed", "prepared"];
}

/** Marks a pre-order prepared, back to confirmed, or cancelled (a cancelled order leaves its route). */
export function setOrderStatus(db: Db, actor: Actor, orderId: string, status: OrderStatusChange, now: Date = new Date()): void {
  const companyId = requireCompanyId(actor);
  transaction(db, () => {
    const order = requireOrder(db, companyId, orderId);
    if (order.kind !== "preorder" || !allowedSources(status).includes(order.status)) {
      throw new ApiError(409, "bad_status", "Action impossible dans l'état actuel de la commande.");
    }
    run(
      db,
      "UPDATE orders SET status = ?, route_id = CASE WHEN ? = 'cancelled' THEN NULL ELSE route_id END WHERE id = ?",
      status,
      status,
      orderId,
    );
    recordAudit(db, actor, `order.${status}`, "order", orderId, { number: order.number }, companyId, now);
  });
}

export interface OrderFilters {
  status?: string | undefined;
  routeId?: string | undefined;
}

/** Latest orders with customer, route and invoice, newest first. */
export function listOrders(db: Db, companyId: string, filters: OrderFilters = {}): Row[] {
  const conditions = ["o.company_id = ?"];
  const params: string[] = [companyId];
  if (filters.status) {
    conditions.push("o.status = ?");
    params.push(filters.status);
  }
  if (filters.routeId) {
    conditions.push("o.route_id = ?");
    params.push(filters.routeId);
  }
  return all(
    db,
    `SELECT o.id, o.number, o.kind, o.status, o.created_at, o.delivered_at, o.route_id, c.name AS customer, c.zone, r.name AS route, r.status AS route_status,
      (SELECT SUM(qty_ordered * unit_price_minor) FROM order_lines WHERE order_id = o.id) AS ordered_minor,
      i.id AS invoice_id, i.number AS invoice_number, i.amount_minor AS invoice_minor, i.status AS invoice_status
    FROM orders o JOIN customers c ON c.id = o.customer_id LEFT JOIN routes r ON r.id = o.route_id LEFT JOIN invoices i ON i.order_id = o.id
    WHERE ${conditions.join(" AND ")} ORDER BY o.created_at DESC, o.rowid DESC LIMIT 300`,
    ...params,
  );
}

/** Everything that follows from one order, for the traceability view. */
export function orderChain(db: Db, companyId: string, orderId: string) {
  const order = get(
    db,
    `SELECT o.*, c.name AS customer, c.address, r.name AS route, u.name AS created_by_name FROM orders o JOIN customers c ON c.id = o.customer_id
    LEFT JOIN routes r ON r.id = o.route_id LEFT JOIN users u ON u.id = o.created_by WHERE o.id = ? AND o.company_id = ?`,
    orderId,
    companyId,
  );
  if (!order) throw notFound("Commande");
  const invoice = get<Row & { id: string }>(db, "SELECT * FROM invoices WHERE order_id = ? AND company_id = ?", orderId, companyId) ?? null;
  const payments = invoice
    ? all<Row & { id: string }>(
        db,
        `SELECT p.id, p.method, p.amount_minor, p.refunded_minor, p.status, p.provider_ref, p.created_at, p.confirmed_at, p.confirmed_via, p.failure_reason, p.verify_reason,
    p.settlement_status, p.settled_at, p.fee_expected_minor, p.fee_expected_known, p.fee_actual_minor, u.name AS agent FROM payments p LEFT JOIN users u ON u.id = p.agent_id WHERE p.invoice_id = ? ORDER BY p.created_at`,
        invoice.id,
      )
    : [];
  // ERP entries are keyed by the entity id, possibly with a suffix (e.g. a refund of a payment).
  const entityIds = [orderId, invoice?.id, ...payments.map((payment) => payment.id)].filter((id): id is string => Boolean(id));
  const erp = all(
    db,
    `SELECT id, kind, label, amount_minor, status, attempts, last_error, external_ref, synced_at FROM erp_entries
    WHERE company_id = ? AND (${entityIds.map(() => "entity_id LIKE ? || '%'").join(" OR ")}) ORDER BY created_at`,
    companyId,
    ...entityIds,
  );
  return {
    order,
    lines: all(
      db,
      "SELECT l.*, p.name AS product, p.sku, p.unit FROM order_lines l JOIN products p ON p.id = l.product_id WHERE l.order_id = ?",
      orderId,
    ),
    delivery: get(db, "SELECT d.*, u.name AS agent FROM deliveries d LEFT JOIN users u ON u.id = d.agent_id WHERE d.order_id = ?", orderId) ?? null,
    invoice,
    payments,
    erp,
  };
}
