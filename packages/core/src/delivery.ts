// Delivery at a customer outlet: full, partial or refused; proof; returns; the invoice amount.

import { invalid } from "./rule-error.ts";

export type DeliveryOutcome = "full" | "partial" | "refused";
export type DeliveredOrderStatus = "delivered" | "partially_delivered" | "refused";

/** Nothing delivered is a refusal; less than ordered is partial. */
export function deliveryOutcome(deliveredQty: number, orderedQty: number): DeliveryOutcome {
  if (deliveredQty === 0) return "refused";
  return deliveredQty < orderedQty ? "partial" : "full";
}

export const orderStatusAfter = (outcome: DeliveryOutcome): DeliveredOrderStatus =>
  outcome === "full" ? "delivered" : outcome === "partial" ? "partially_delivered" : "refused";

/** A delivered quantity above the quantity ordered. */
export function checkDeliveredQty(qtyDelivered: number, qtyOrdered: number): void {
  if (qtyDelivered > qtyOrdered) throw invalid("qty_exceeds_order", "Quantité livrée supérieure à la quantité commandée.");
}

export interface HandoverProof {
  /** Reason of a partial delivery or of a refusal. */
  reason: string;
  /** Receiver's name. */
  receiverName: string;
  returnLines: number;
}

/**
 * A partial delivery or a refusal needs its reason (3 characters at least); goods handed over need
 * the receiver's name (2 at least); nothing can be taken back on a refusal.
 */
export function checkHandover(outcome: DeliveryOutcome, proof: HandoverProof): void {
  const reason = proof.reason.trim();
  if (outcome === "refused" && reason.length < 3) throw invalid("reason_required", "Indiquez le motif du refus ou de la non-livraison.");
  if (outcome === "partial" && reason.length < 3) throw invalid("reason_required", "Indiquez le motif de la livraison partielle.");
  if (outcome !== "refused" && proof.receiverName.trim().length < 2) {
    throw invalid("pod_required", "Le nom du réceptionnaire est requis comme preuve de livraison.");
  }
  if (outcome === "refused" && proof.returnLines) throw invalid("invalid_returns", "Un retour ne peut pas être saisi sur une livraison refusée.");
}

export interface PricedLine {
  qty: number;
  /** Unit price in minor units. */
  unitPriceMinor: number;
}

export interface InvoiceAmount {
  /** Delivered value minus returns: what is invoiced. */
  amountMinor: number;
  returnsMinor: number;
}

/**
 * Invoice of a handover: the quantities actually delivered at the order's prices, minus the
 * returns at the outlet's prices. Returns worth more than the delivery are refused. Nothing is
 * invoiced at 0 (refusal, or returns worth the whole delivery).
 */
export function invoiceAmount(delivered: readonly PricedLine[], returns: readonly PricedLine[]): InvoiceAmount {
  const returnsMinor = returns.reduce((sum, line) => sum + line.qty * line.unitPriceMinor, 0);
  const amountMinor = delivered.reduce((sum, line) => sum + line.qty * line.unitPriceMinor, 0) - returnsMinor;
  if (amountMinor < 0) throw invalid("returns_exceed_delivery", "La valeur des retours dépasse celle de la livraison.");
  return { amountMinor, returnsMinor };
}

export const isInvoiced = (amount: InvoiceAmount): boolean => amount.amountMinor > 0;

/**
 * Unit price for a customer outlet: its price list's price when the list has the product, else
 * the product's list price.
 */
export const unitPriceFor = (listPriceMinor: number, priceListPriceMinor: number | null | undefined): number =>
  priceListPriceMinor ?? listPriceMinor;

/** The total shown on the phone differs from the invoice (prices changed while offline). */
export interface PriceMismatch {
  shownMinor: number;
  invoicedMinor: number;
}

export function priceMismatch(shownMinor: number | undefined, invoicedMinor: number): PriceMismatch | null {
  return shownMinor !== undefined && shownMinor !== invoicedMinor ? { shownMinor, invoicedMinor } : null;
}
