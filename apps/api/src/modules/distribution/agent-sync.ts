// Field agent: route start, offline bundle, offline actions (delivery of a pre-order, on-the-spot
// sale) replayed at reconnection, and route close.
import {
  type DeliveryOutcome,
  type PriceMismatch,
  checkDeliveredQty,
  checkHandover,
  deliveryOutcome,
  fieldTime,
  invoiceAmount,
  isInvoiced,
  isStockVariance,
  orderStatusAfter,
  priceMismatch,
  replayDecision,
  wasOffline,
  OFFLINE_ACTION_TYPES,
} from "@mips/core";
import { z } from "zod";
import { type Db, all, get, run, transaction } from "../../core/db.ts";
import { newId } from "../../core/ids.ts";
import { iso } from "../../core/time.ts";
import { recordAudit } from "../../core/audit.ts";
import { ApiError, asApiError, notFound } from "../../core/errors.ts";
import type { Actor } from "../../core/actor.ts";
import { requireCompanyId } from "./access.ts";
import { customerOutletPrices, requireActiveCustomerOutlet } from "./catalog.ts";
import { nextNumber } from "./counters.ts";
import { type RouteRow, addRouteStop, requireRoute, routeSummary } from "./delivery-routes.ts";
import { queueErpEntry, raiseException } from "./exceptions.ts";
import { type OrderRow, requireOrder } from "./orders.ts";
import { recordStockMovement } from "./stock.ts";

// ───────── Input schemas ─────────

/** Proof of delivery: receiver's name, optional PNG signature, free note. */
export const proofOfDeliveryInput = z.object({
  name: z.string().max(80).default(""),
  signature: z
    .string()
    .max(200000)
    .regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/)
    .nullish(),
  note: z.string().max(300).default(""),
});

/** Goods taken back from the customer. */
export const returnsInput = z
  .array(z.object({ productId: z.string(), qty: z.number().int().min(1).max(10000) }))
  .max(50)
  .default([]);

export const deliverOrderInput = z.object({
  orderId: z.string(),
  lines: z.array(z.object({ lineId: z.string(), qtyDelivered: z.number().int().min(0) })).max(100),
  returns: returnsInput,
  reason: z.string().max(200).default(""),
  pod: proofOfDeliveryInput.default({ name: "", note: "" }),
  /** When the agent performed the action (the device clock, possibly offline). */
  at: z.string(),
  /** Total the agent's screen showed, to detect prices changed while offline. */
  expectedTotalMinor: z.number().int().optional(),
});

export const routeSaleInput = z.object({
  routeId: z.string(),
  customerOutletId: z.string(),
  lines: z
    .array(z.object({ productId: z.string(), qty: z.number().int().min(1).max(10000) }))
    .min(1)
    .max(100),
  returns: returnsInput,
  pod: proofOfDeliveryInput,
  at: z.string(),
  expectedTotalMinor: z.number().int().optional(),
});

/** One offline action, identified by the device so that a replay is applied only once. */
export const syncActionInput = z.object({
  id: z.string().min(8).max(64),
  type: z.enum(OFFLINE_ACTION_TYPES),
  payload: z.unknown(),
});
export type SyncActionInput = z.output<typeof syncActionInput>;

type ProofOfDelivery = z.output<typeof proofOfDeliveryInput>;
type ReturnLine = z.output<typeof returnsInput>[number];

// ───────── Route ownership, start and bundle ─────────

/** A route of the actor's company that is assigned to the actor. */
function requireOwnRoute(db: Db, agent: Actor, routeId: string): RouteRow {
  const route = requireRoute(db, requireCompanyId(agent), routeId);
  if (route.agent_id !== agent.id) throw new ApiError(403, "forbidden", "Cette tournée est affectée à un autre agent.");
  return route;
}

/** Starts a loaded route; starting a route already in progress is a no-op. */
export function startRoute(db: Db, agent: Actor, routeId: string, now: Date = new Date()): void {
  transaction(db, () => {
    const route = requireOwnRoute(db, agent, routeId);
    if (route.status === "in_progress") return;
    if (route.status !== "loaded") {
      throw new ApiError(
        409,
        "bad_status",
        route.status === "planned" ? "Le véhicule n'est pas encore chargé par la centrale." : "Tournée clôturée.",
      );
    }
    run(db, "UPDATE routes SET status = 'in_progress', started_at = ? WHERE id = ?", iso(now), routeId);
    recordAudit(db, agent, "route.started", "route", routeId, { name: route.name }, route.company_id, now);
  });
}

/** Everything the agent's device needs to work offline for the whole route. */
export function routeBundle(db: Db, agent: Actor, routeId: string, now: Date = new Date()) {
  const route = requireOwnRoute(db, agent, routeId);
  const companyId = route.company_id;
  const stops = all<{ price_list_id: string | null }>(
    db,
    `SELECT s.customer_outlet_id, s.seq, c.name, c.code, c.address, c.zone, c.phone, c.price_list_id
    FROM route_stops s JOIN customer_outlets c ON c.id = s.customer_outlet_id WHERE s.route_id = ? ORDER BY s.seq`,
    routeId,
  );
  const orders = all<{ id: string }>(
    db,
    "SELECT o.id, o.number, o.kind, o.status, o.customer_outlet_id, o.note, o.delivered_at FROM orders o WHERE o.route_id = ? AND o.status != 'cancelled' ORDER BY o.created_at",
    routeId,
  );
  const lines = all<{ order_id: string }>(
    db,
    "SELECT l.id, l.order_id, l.product_id, l.qty_ordered, l.qty_delivered, l.unit_price_minor FROM order_lines l JOIN orders o ON o.id = l.order_id WHERE o.route_id = ?",
    routeId,
  );
  const invoices = all<{ id: string }>(
    db,
    "SELECT id, number, order_id, customer_outlet_id, amount_minor, paid_minor, refunded_minor, status, issued_at FROM invoices WHERE route_id = ? ORDER BY issued_at",
    routeId,
  );
  const payments = all<{ invoice_id: string }>(
    db,
    `SELECT p.id, p.invoice_id, p.method, p.amount_minor, p.refunded_minor, p.status, p.provider_ref, p.created_at, p.failure_reason, p.verify_reason
    FROM payments p JOIN invoices i ON i.id = p.invoice_id WHERE i.route_id = ? ORDER BY p.created_at`,
    routeId,
  );
  const priceListIds = [...new Set(stops.map((stop) => stop.price_list_id).filter((id): id is string => Boolean(id)))];
  return {
    generatedAt: iso(now),
    route: { id: route.id, name: route.name, day: route.day, vehicle: route.vehicle, status: route.status },
    stops,
    orders: orders.map((order) => ({ ...order, lines: lines.filter((line) => line.order_id === order.id) })),
    invoices: invoices.map((invoice) => ({ ...invoice, payments: payments.filter((payment) => payment.invoice_id === invoice.id) })),
    products: all(db, "SELECT id, sku, name, unit, price_minor FROM products WHERE company_id = ? AND active = 1 ORDER BY name", companyId),
    priceLists: Object.fromEntries(
      priceListIds.map((priceListId) => [
        priceListId,
        Object.fromEntries(
          all<{ product_id: string; price_minor: number }>(
            db,
            "SELECT product_id, price_minor FROM price_list_items WHERE price_list_id = ?",
            priceListId,
          ).map((item) => [item.product_id, item.price_minor]),
        ),
      ]),
    ),
    stock: Object.fromEntries(
      all<{ product_id: string; qty: number }>(db, "SELECT product_id, qty FROM vehicle_stock WHERE route_id = ?", routeId).map((row) => [
        row.product_id,
        row.qty,
      ]),
    ),
    customer_outlets: all(
      db,
      "SELECT id, name, code, zone, address, phone, price_list_id FROM customer_outlets WHERE company_id = ? AND active = 1 ORDER BY name",
      companyId,
    ),
  };
}

// ───────── Delivery (shared by pre-order deliveries and on-the-spot sales) ─────────

interface DeliveredLine {
  productId: string;
  qty: number;
  price: number;
}

interface Handover {
  agent: Actor;
  route: RouteRow;
  order: OrderRow;
  delivered: DeliveredLine[];
  /** Total quantity ordered, to tell a full delivery from a partial one. */
  ordered: number;
  returns: ReturnLine[];
  reason: string;
  pod: ProofOfDelivery;
  /** When it happened on the field. */
  at: Date;
  /** When the server receives it. */
  now: Date;
  expectedTotalMinor: number | undefined;
}

export type { DeliveryOutcome } from "@mips/core";

export interface DeliveryResult {
  orderId: string;
  orderNumber: string;
  outcome: DeliveryOutcome;
  invoiceId: string | null;
  invoiceNumber: string | null;
  amountMinor: number;
  /** Only when the total shown on the phone differs from the invoice (prices changed while offline). */
  priceMismatch?: PriceMismatch;
}

/**
 * Records a handover at a customer: vehicle stock, returns, delivery with its proof, the invoice
 * (delivered value minus returns, at the customer's prices) and the exceptions it raises.
 */
function recordHandover(db: Db, handover: Handover): DeliveryResult {
  const { agent, route, order, now } = handover;
  const companyId = route.company_id;
  const deliveredQty = handover.delivered.reduce((sum, line) => sum + line.qty, 0);
  const outcome = deliveryOutcome(deliveredQty, handover.ordered);
  checkHandover(outcome, { reason: handover.reason, receiverName: handover.pod.name, returnLines: handover.returns.length });

  // Returns are credited at the customer's current prices.
  const prices = customerOutletPrices(db, companyId, order.customer_outlet_id);
  const productNames = new Map(
    all<{ id: string; name: string }>(db, "SELECT id, name FROM products WHERE company_id = ?", companyId).map((p) => [p.id, p.name]),
  );
  const returns = handover.returns.map((line) => {
    const unitPriceMinor = prices.get(line.productId);
    if (unitPriceMinor === undefined) throw notFound("Produit retourné");
    return { ...line, product: productNames.get(line.productId), unitPriceMinor };
  });
  const { amountMinor, returnsMinor } = invoiceAmount(
    handover.delivered.map((line) => ({ qty: line.qty, unitPriceMinor: line.price })),
    returns,
  );

  const orderNumber = order.number;
  for (const line of handover.delivered) {
    if (!line.qty) continue;
    run(
      db,
      "INSERT INTO vehicle_stock (route_id, product_id, company_id, qty) VALUES (?,?,?,?) ON CONFLICT (route_id, product_id) DO UPDATE SET qty = qty + excluded.qty",
      route.id,
      line.productId,
      companyId,
      -line.qty,
    );
    recordStockMovement(db, companyId, line.productId, route.id, order.kind === "route_sale" ? "sale" : "delivery", -line.qty, orderNumber, agent.id, handover.at);
    // The delivery is accepted even beyond the vehicle stock (the goods were handed over): the gap is flagged.
    const { qty } = get<{ qty: number }>(db, "SELECT qty FROM vehicle_stock WHERE route_id = ? AND product_id = ?", route.id, line.productId)!;
    if (isStockVariance(qty)) {
      raiseException(
        db,
        companyId,
        "ops",
        "stock_variance",
        "route",
        `${route.id}:${line.productId}`,
        `Stock véhicule négatif pour ${productNames.get(line.productId)} sur ${route.name} (${qty}) : écart d'inventaire à vérifier.`,
        { routeId: route.id, productId: line.productId, qty, order: orderNumber },
        now,
      );
    }
  }
  for (const line of returns) {
    run(
      db,
      "INSERT INTO vehicle_stock (route_id, product_id, company_id, returned_qty) VALUES (?,?,?,?) ON CONFLICT (route_id, product_id) DO UPDATE SET returned_qty = returned_qty + excluded.returned_qty",
      route.id,
      line.productId,
      companyId,
      line.qty,
    );
    recordStockMovement(db, companyId, line.productId, route.id, "return", line.qty, orderNumber, agent.id, handover.at);
  }

  run(db, "UPDATE orders SET status = ?, delivered_at = ? WHERE id = ?", orderStatusAfter(outcome), iso(handover.at), order.id);
  const offline = Number(wasOffline(handover.at, now));
  const reason = handover.reason.trim();
  run(
    db,
    `INSERT INTO deliveries (id, company_id, order_id, route_id, agent_id, outcome, reason, returns_json, returns_minor, pod_name, pod_signature, pod_note, at, synced_at, offline)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    newId("dlv"),
    companyId,
    order.id,
    route.id,
    agent.id,
    outcome,
    reason,
    JSON.stringify(returns),
    returnsMinor,
    handover.pod.name.trim(),
    handover.pod.signature ?? null,
    handover.pod.note,
    iso(handover.at),
    iso(now),
    offline,
  );

  // Nothing is invoiced when nothing is owed (refusal, or returns worth the whole delivery).
  let invoice: { id: string; number: string } | null = null;
  if (isInvoiced({ amountMinor, returnsMinor })) {
    const invoiceId = newId("inv");
    invoice = { id: invoiceId, number: nextNumber(db, companyId, "invoice", "FAC") };
    const { currency } = get<{ currency: string }>(db, "SELECT currency FROM companies WHERE id = ?", companyId)!;
    run(
      db,
      "INSERT INTO invoices (id, company_id, number, order_id, customer_outlet_id, route_id, agent_id, currency, amount_minor, issued_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      invoice.id,
      companyId,
      invoice.number,
      order.id,
      order.customer_outlet_id,
      route.id,
      agent.id,
      currency,
      amountMinor,
      iso(handover.at),
    );
    queueErpEntry(
      db,
      companyId,
      "invoice",
      invoice.id,
      `Facture ${invoice.number}`,
      amountMinor,
      { invoice: invoice.number, order: orderNumber, customerOutletId: order.customer_outlet_id, amountMinor, returnsMinor, currency },
      now,
    );
  }

  const { name: customerOutlet } = get<{ name: string }>(db, "SELECT name FROM customer_outlets WHERE id = ?", order.customer_outlet_id)!;
  if (outcome === "partial") {
    raiseException(db, companyId, "ops", "delivery_partial", "order", order.id, `Livraison partielle de ${orderNumber} chez ${customerOutlet} : ${reason}`, {
      order: orderNumber,
      customerOutlet,
      reason,
    }, now);
  }
  if (outcome === "refused") {
    raiseException(db, companyId, "ops", "delivery_refused", "order", order.id, `${orderNumber} non livrée chez ${customerOutlet} : ${reason}`, {
      order: orderNumber,
      customerOutlet,
      reason,
    }, now);
  }
  // Returns need a credit note, validated by the office.
  if (returns.length) {
    raiseException(db, companyId, "ops", "return", "delivery", order.id, `Retour de marchandise chez ${customerOutlet} sur ${orderNumber} : avoir à valider.`, {
      order: orderNumber,
      customerOutlet,
      returns,
      returnsMinor,
    }, now);
  }
  const mismatch = priceMismatch(handover.expectedTotalMinor, amountMinor);
  if (mismatch) {
    raiseException(
      db,
      companyId,
      "ops",
      "price_mismatch",
      "invoice",
      invoice?.id ?? order.id,
      `Montant affiché à l'agent différent du montant facturé sur ${orderNumber} (prix mis à jour pendant le hors-ligne).`,
      { order: orderNumber, ...mismatch },
      now,
    );
  }
  recordAudit(db, agent, `delivery.${outcome}`, "order", order.id, { order: orderNumber, customerOutlet, amountMinor, offline: !!offline }, companyId, now);
  return {
    orderId: order.id,
    orderNumber,
    outcome,
    invoiceId: invoice?.id ?? null,
    invoiceNumber: invoice?.number ?? null,
    amountMinor,
    // The driver is told at once: the invoice, not the phone's total, is what the outlet owes.
    ...(mismatch ? { priceMismatch: mismatch } : {}),
  };
}

/** Delivery of a loaded pre-order. */
function deliverOrder(db: Db, agent: Actor, payload: unknown, now: Date): DeliveryResult {
  const input = deliverOrderInput.parse(payload);
  const order = requireOrder(db, requireCompanyId(agent), input.orderId);
  if (!order.route_id) throw new ApiError(409, "bad_status", "Commande non affectée à une tournée.");
  const route = requireOwnRoute(db, agent, order.route_id);
  if (route.status !== "in_progress") throw new ApiError(409, "route_not_started", "La tournée n'est pas en cours.");
  if (order.status !== "loaded") throw new ApiError(409, "already_handled", `La commande ${order.number} a déjà été traitée.`);
  const lines = all<{ id: string; product_id: string; qty_ordered: number; unit_price_minor: number }>(
    db,
    "SELECT * FROM order_lines WHERE order_id = ?",
    order.id,
  );
  const deliveredByLine = new Map(input.lines.map((line) => [line.lineId, line.qtyDelivered]));
  return recordHandover(db, {
    agent,
    route,
    order,
    // Lines the agent did not mention count as not delivered.
    delivered: lines.map((line) => {
      const qty = deliveredByLine.get(line.id) ?? 0;
      checkDeliveredQty(qty, line.qty_ordered);
      run(db, "UPDATE order_lines SET qty_delivered = ? WHERE id = ?", qty, line.id);
      return { productId: line.product_id, qty, price: line.unit_price_minor };
    }),
    ordered: lines.reduce((sum, line) => sum + line.qty_ordered, 0),
    returns: input.returns,
    reason: input.reason,
    pod: input.pod,
    at: fieldTime(input.at, now),
    now,
    expectedTotalMinor: input.expectedTotalMinor,
  });
}

/** On-the-spot sale from the vehicle stock: creates the order and delivers it at once. */
function sellOnRoute(db: Db, agent: Actor, payload: unknown, now: Date): DeliveryResult {
  const input = routeSaleInput.parse(payload);
  const route = requireOwnRoute(db, agent, input.routeId);
  const companyId = route.company_id;
  if (route.status !== "in_progress") throw new ApiError(409, "route_not_started", "La tournée n'est pas en cours.");
  requireActiveCustomerOutlet(db, companyId, input.customerOutletId);
  const prices = customerOutletPrices(db, companyId, input.customerOutletId);
  const at = fieldTime(input.at, now);
  const orderId = newId("ord");
  const number = nextNumber(db, companyId, "order", "CMD");
  run(
    db,
    "INSERT INTO orders (id, company_id, number, customer_outlet_id, route_id, kind, status, created_by, created_at) VALUES (?,?,?,?,?,'route_sale','loaded',?,?)",
    orderId,
    companyId,
    number,
    input.customerOutletId,
    route.id,
    agent.id,
    iso(at),
  );
  addRouteStop(db, companyId, route.id, input.customerOutletId);
  const delivered = input.lines.map((line) => {
    const price = prices.get(line.productId);
    if (price === undefined) throw notFound("Produit");
    run(
      db,
      "INSERT INTO order_lines (id, order_id, company_id, product_id, qty_ordered, qty_delivered, unit_price_minor) VALUES (?,?,?,?,?,?,?)",
      newId("ol"),
      orderId,
      companyId,
      line.productId,
      line.qty,
      line.qty,
      price,
    );
    return { productId: line.productId, qty: line.qty, price };
  });
  return recordHandover(db, {
    agent,
    route,
    order: {
      id: orderId,
      company_id: companyId,
      number,
      customer_outlet_id: input.customerOutletId,
      route_id: route.id,
      kind: "route_sale",
      status: "loaded",
    },
    delivered,
    ordered: delivered.reduce((sum, line) => sum + line.qty, 0),
    returns: input.returns,
    reason: "",
    pod: input.pod,
    at,
    now,
    expectedTotalMinor: input.expectedTotalMinor,
  });
}

export type SyncActionResult =
  | { id: string; status: "duplicate" | "applied"; result: DeliveryResult }
  | { id: string; status: "rejected"; code: string; message: string };

/**
 * Applies one offline action. An action already applied returns its stored result; a business
 * refusal or unreadable payload is reported per action instead of failing the whole sync.
 */
export function applySyncAction(db: Db, agent: Actor, action: SyncActionInput, now: Date = new Date()): SyncActionResult {
  const companyId = requireCompanyId(agent);
  const applied = get<{ result_json: string }>(
    db,
    "SELECT result_json FROM sync_actions WHERE company_id = ? AND action_id = ?",
    companyId,
    action.id,
  );
  const replay = replayDecision<DeliveryResult>(applied && JSON.parse(applied.result_json));
  if (replay.replay) return { id: action.id, status: "duplicate", result: replay.result };
  try {
    const result = transaction(db, () => {
      const outcome = action.type === "deliver" ? deliverOrder(db, agent, action.payload, now) : sellOnRoute(db, agent, action.payload, now);
      run(
        db,
        "INSERT INTO sync_actions (company_id, action_id, agent_id, type, result_json, applied_at) VALUES (?,?,?,?,?,?)",
        companyId,
        action.id,
        agent.id,
        action.type,
        JSON.stringify(outcome),
        iso(now),
      );
      return outcome;
    });
    return { id: action.id, status: "applied", result };
  } catch (error) {
    const refused = asApiError(error);
    if (refused) return { id: action.id, status: "rejected", code: refused.code, message: refused.message };
    if (error instanceof z.ZodError) {
      return { id: action.id, status: "rejected", code: "invalid_input", message: "Action illisible : données invalides." };
    }
    throw error;
  }
}

// ───────── Close ─────────

/**
 * Closes the route once every order is handled and no payment is pending: the remaining vehicle
 * stock goes back to the warehouse; returned goods are logged for inspection but not restocked.
 */
export function closeRoute(db: Db, agent: Actor, routeId: string, now: Date = new Date()) {
  return transaction(db, () => {
    const route = requireOwnRoute(db, agent, routeId);
    const companyId = route.company_id;
    if (route.status !== "in_progress") throw new ApiError(409, "bad_status", "Seule une tournée en cours peut être clôturée.");
    const open = all<{ number: string }>(db, "SELECT number FROM orders WHERE route_id = ? AND status = 'loaded'", routeId);
    if (open.length) {
      throw new ApiError(
        409,
        "orders_open",
        `Commandes non traitées : ${open.map((order) => order.number).join(", ")}. Livrez-les ou déclarez-les non livrées.`,
      );
    }
    const pending = get<{ n: number }>(
      db,
      "SELECT COUNT(*) AS n FROM payments p JOIN invoices i ON i.id = p.invoice_id WHERE i.route_id = ? AND p.status = 'pending'",
      routeId,
    )!.n;
    if (pending) {
      throw new ApiError(409, "payments_pending", "Des paiements sont encore en attente : vérifiez leur statut avant de clôturer.");
    }
    for (const stock of all<{ product_id: string; qty: number; returned_qty: number }>(
      db,
      "SELECT product_id, qty, returned_qty FROM vehicle_stock WHERE route_id = ?",
      routeId,
    )) {
      if (stock.qty > 0) {
        run(
          db,
          "INSERT INTO warehouse_stock (company_id, product_id, qty) VALUES (?,?,?) ON CONFLICT (company_id, product_id) DO UPDATE SET qty = qty + excluded.qty",
          companyId,
          stock.product_id,
          stock.qty,
        );
        recordStockMovement(db, companyId, stock.product_id, routeId, "unload", stock.qty, route.name, agent.id, now);
      }
      if (stock.returned_qty > 0) {
        recordStockMovement(db, companyId, stock.product_id, routeId, "return_in", stock.returned_qty, route.name, agent.id, now, "Retours clients à contrôler");
      }
    }
    run(db, "UPDATE routes SET status = 'closed', closed_at = ? WHERE id = ?", iso(now), routeId);
    const summary = routeSummary(db, companyId, routeId);
    recordAudit(
      db,
      agent,
      "route.closed",
      "route",
      routeId,
      { name: route.name, invoicedMinor: summary.money.invoiced, confirmedMinor: summary.money.confirmed },
      companyId,
      now,
    );
    return summary;
  });
}
