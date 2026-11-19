// Invoice payments (distribution `payments` table): lookup and API serialization. Shared with the
// payments module, where these will move.
import { type Db, get } from "../../core/db.ts";
import { notFound } from "../../core/errors.ts";

export interface PaymentRow {
  id: string;
  company_id: string;
  invoice_id: string;
  method: string;
  amount_minor: number;
  currency: string;
  status: string;
  refunded_minor: number;
  provider_ref: string | null;
  presentation_json: string;
  failure_reason: string | null;
  verify_reason: string | null;
  settlement_status: string;
  created_at: string;
  expires_at: string | null;
  confirmed_at: string | null;
  confirmed_via: string | null;
}

export function requireCompanyPayment(db: Db, companyId: string, paymentId: string): PaymentRow {
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
