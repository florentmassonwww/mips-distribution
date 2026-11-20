// Invoice balance and status, derived from the amounts and the attempts in progress.

import type { PaymentStatus } from "./payments.ts";

export type InvoiceStatus = "unpaid" | "pending" | "to_verify" | "partially_paid" | "paid" | "failed" | "refunded";

export interface InvoiceAmounts {
  amountMinor: number;
  /** Confirmed payments, before refunds. */
  paidMinor: number;
  refundedMinor: number;
}

/** What is still owed: amount minus the payments kept (confirmed minus refunded). */
export const balanceDue = (invoice: InvoiceAmounts): number => invoice.amountMinor - (invoice.paidMinor - invoice.refundedMinor);

export interface InvoiceState extends InvoiceAmounts {
  hasAttemptToVerify: boolean;
  hasPendingAttempt: boolean;
  /** Status of the most recent attempt, if any. */
  lastAttempt: PaymentStatus | undefined;
}

/**
 * Status of an invoice. An attempt in progress wins over the amounts: "to verify" first (a possible
 * double debit), then "pending". Then paid, partially paid, refunded, failed, unpaid.
 */
export function invoiceStatus(invoice: InvoiceState): InvoiceStatus {
  if (invoice.hasAttemptToVerify) return "to_verify";
  if (invoice.hasPendingAttempt) return "pending";
  const kept = invoice.paidMinor - invoice.refundedMinor;
  if (kept >= invoice.amountMinor) return "paid";
  if (kept > 0) return "partially_paid";
  if (invoice.paidMinor > 0) return "refunded";
  return invoice.lastAttempt === "failed" ? "failed" : "unpaid";
}
