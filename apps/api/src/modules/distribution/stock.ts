// Warehouse stock and the movement log shared by the warehouse and the vehicles.
import { checkWarehouseLevel } from "@mips/core";
import { type Db, all, get, run, transaction } from "../../core/db.ts";
import { newId } from "../../core/ids.ts";
import { iso } from "../../core/time.ts";
import { recordAudit } from "../../core/audit.ts";
import { notFound } from "../../core/errors.ts";
import type { Actor } from "../../core/actor.ts";
import { requireCompanyId } from "./access.ts";

export type StockMovementType = "load" | "unload" | "delivery" | "sale" | "return" | "return_in" | "adjust";

/** Appends one line to the stock movement log (negative `qty` leaves the warehouse or the vehicle). */
export function recordStockMovement(
  db: Db,
  companyId: string,
  productId: string,
  routeId: string | null,
  type: StockMovementType,
  qty: number,
  ref: string,
  actorId: string,
  at: Date,
  note = "",
): void {
  run(
    db,
    "INSERT INTO stock_movements (id, company_id, product_id, route_id, type, qty, ref, note, actor, at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    newId("mv"),
    companyId,
    productId,
    routeId,
    type,
    qty,
    ref,
    note,
    actorId,
    iso(at),
  );
}

/** Warehouse levels (with stock on the road and stock reserved by open orders) and the latest movements. */
export function readStock(db: Db, companyId: string) {
  return {
    warehouse: all(
      db,
      `SELECT p.id, p.sku, p.name, p.unit, p.price_minor, COALESCE(w.qty, 0) AS qty,
        (SELECT COALESCE(SUM(v.qty), 0) FROM vehicle_stock v JOIN routes r ON r.id = v.route_id WHERE v.product_id = p.id AND r.status IN ('loaded','in_progress')) AS on_vehicles,
        (SELECT COALESCE(SUM(l.qty_ordered), 0) FROM order_lines l JOIN orders o ON o.id = l.order_id WHERE l.product_id = p.id AND o.status IN ('confirmed','prepared')) AS reserved
      FROM products p LEFT JOIN warehouse_stock w ON w.product_id = p.id AND w.company_id = p.company_id WHERE p.company_id = ? AND p.active = 1 ORDER BY p.name`,
      companyId,
    ),
    movements: all(
      db,
      `SELECT m.id, m.at, m.type, m.qty, m.ref, m.note, p.name AS product, u.name AS actor, r.name AS route FROM stock_movements m JOIN products p ON p.id = m.product_id
      LEFT JOIN users u ON u.id = m.actor LEFT JOIN routes r ON r.id = m.route_id WHERE m.company_id = ? ORDER BY m.at DESC, m.rowid DESC LIMIT 80`,
      companyId,
    ),
  };
}

/** Manual warehouse correction (inventory count, breakage…); the stock may never go below zero. */
export function adjustStock(db: Db, actor: Actor, productId: string, delta: number, reason: string, now: Date = new Date()): void {
  const companyId = requireCompanyId(actor);
  transaction(db, () => {
    const product = get<{ name: string }>(db, "SELECT name FROM products WHERE id = ? AND company_id = ?", productId, companyId);
    if (!product) throw notFound("Produit");
    run(
      db,
      "INSERT INTO warehouse_stock (company_id, product_id, qty) VALUES (?,?,?) ON CONFLICT (company_id, product_id) DO UPDATE SET qty = qty + excluded.qty",
      companyId,
      productId,
      delta,
    );
    const { qty } = get<{ qty: number }>(db, "SELECT qty FROM warehouse_stock WHERE company_id = ? AND product_id = ?", companyId, productId)!;
    checkWarehouseLevel(qty);
    recordStockMovement(db, companyId, productId, null, "adjust", delta, "Ajustement", actor.id, now, reason);
    recordAudit(db, actor, "stock.adjusted", "product", productId, { product: product.name, delta, reason }, companyId, now);
  });
}
