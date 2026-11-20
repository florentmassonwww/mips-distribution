// Warehouse and vehicle stock.

import { conflict } from "./rule-error.ts";

/** Shortest reason accepted for a manual adjustment. */
export const ADJUSTMENT_REASON_MIN = 3;

/**
 * A manual adjustment needs a non-zero whole change and a reason (3 characters at least). The API
 * schema refuses such input first (`invalid_input`); this is the rule it mirrors.
 */
export const isValidAdjustment = (delta: number, reason: string): boolean =>
  Number.isInteger(delta) && delta !== 0 && reason.length >= ADJUSTMENT_REASON_MIN;

/** The warehouse never goes below zero. */
export function checkWarehouseLevel(qtyAfter: number): void {
  if (qtyAfter < 0) throw conflict("negative_stock", "L'ajustement rendrait le stock négatif.");
}

/**
 * Quantities to load per product, in this order: the prepared orders, then the extra stock taken
 * for on-the-spot sales (zero or negative extras are ignored).
 */
export function loadQuantities(
  prepared: readonly { productId: string; qty: number }[],
  extras: readonly { productId: string; qty: number }[],
): Map<string, number> {
  const toLoad = new Map<string, number>();
  for (const line of prepared) toLoad.set(line.productId, line.qty);
  for (const extra of extras) if (extra.qty > 0) toLoad.set(extra.productId, (toLoad.get(extra.productId) ?? 0) + extra.qty);
  if (!toLoad.size) throw conflict("nothing_to_load", "Rien à charger : ajoutez des commandes préparées ou du stock de vente.");
  return toLoad;
}

/** Loading takes from the warehouse: a product short in the warehouse stops the whole loading. */
export function checkLoadLine(productName: string, availableQty: number, requestedQty: number): void {
  if (availableQty < requestedQty) {
    throw conflict("insufficient_stock", `Stock dépôt insuffisant pour ${productName} : ${availableQty} disponible(s), ${requestedQty} demandé(s).`);
  }
}

/**
 * A handover beyond the vehicle stock is accepted (the goods were handed over), but a negative
 * vehicle level is an inventory gap to check.
 */
export const isStockVariance = (vehicleQtyAfter: number): boolean => vehicleQtyAfter < 0;
