// Bank statement lines matched against payments. Matching settles a payment ("settled"), which is
// a state separate from its confirmation.

import type { PaymentStatus, Settlement } from "./payments.ts";

export type LineMatch = "matched" | "unmatched" | "amount_mismatch" | "duplicate";

/** Why a line is not matched: each opens a finance exception. */
export type LineException = "unknown_credit" | "duplicate_settlement" | "credit_on_failed" | "settlement_amount_mismatch";

export interface PaymentToMatch {
  status: PaymentStatus;
  settlement: Settlement;
  amountMinor: number;
  refundedMinor: number;
}

export type MatchDecision = { match: "matched" } | { match: Exclude<LineMatch, "matched">; exception: LineException };

/**
 * Matching of one new bank line with the payment of the same provider reference: no payment, a
 * second credit, a credit for a failed payment, or a credit other than the amount kept (amount
 * minus refunds) is an exception; anything else settles the payment.
 */
export function matchStatementLine(grossMinor: number, payment: PaymentToMatch | undefined): MatchDecision {
  if (!payment) return { match: "unmatched", exception: "unknown_credit" };
  if (payment.settlement === "settled") return { match: "duplicate", exception: "duplicate_settlement" };
  if (payment.status === "failed") return { match: "unmatched", exception: "credit_on_failed" };
  if (grossMinor !== payment.amountMinor - payment.refundedMinor) return { match: "amount_mismatch", exception: "settlement_amount_mismatch" };
  return { match: "matched" };
}

/**
 * The bank credit is a proof of payment: an attempt still pending or to verify that is matched is
 * confirmed first ("bank_statement"), then settled.
 */
export const confirmedBySettlement = (status: PaymentStatus): boolean => status === "pending" || status === "to_verify";

/** A fee variance is only an exception against a fee actually agreed. It does not prevent the match. */
export const isFeeVariance = (chargedFeeMinor: number, expected: { minor: number; known: boolean }): boolean =>
  expected.known && chargedFeeMinor !== expected.minor;
