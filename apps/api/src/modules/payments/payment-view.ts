// Invoice payments (distribution `payments` table): company-scoped lookup and API serialization.
import { type Db, get } from "../../core/db.ts";
import { notFound } from "../../core/errors.ts";
import type { PaymentRow } from "./types.ts";

export function requireCompanyPayment(db: Db, companyId: string | null, paymentId: string): PaymentRow {
  const payment = get<PaymentRow>(db, "SELECT * FROM payments WHERE id = ? AND company_id = ?", paymentId, companyId);
  if (!payment) throw notFound("Paiement");
  return payment;
}

/** Payment as returned by the API (camelCase, presentation parsed). */
export const serializePayment = (payment: PaymentRow) => ({
  id: payment.id,
  invoiceId: payment.invoice_id,
  method: payment.method,
  amountMinor: payment.amount_minor,
  currency: payment.currency,
  status: payment.status,
  refundedMinor: payment.refunded_minor,
  providerRef: payment.provider_ref,
  presentation: JSON.parse(payment.presentation_json) as unknown,
  failureReason: payment.failure_reason,
  verifyReason: payment.verify_reason,
  settlementStatus: payment.settlement_status,
  createdAt: payment.created_at,
  expiresAt: payment.expires_at,
  confirmedAt: payment.confirmed_at,
  confirmedVia: payment.confirmed_via,
});
