// Refunds of confirmed payments, full or partial, through the provider.
import { type Actor, companyOf } from "../../core/actor.ts";
import { recordAudit } from "../../core/audit.ts";
import { type Db, get, run, transaction } from "../../core/db.ts";
import { ApiError } from "../../core/errors.ts";
import type { ConnectorSet } from "../connectors/index.ts";
import { getCompanyPayment, queueAccountingEntry, resolveExceptions } from "./legacy-imports.ts";
import { refreshInvoiceStatus, touchPayment } from "./lifecycle.ts";
import type { PaymentRow } from "./types.ts";

/**
 * Reserves the amount on the payment before calling the provider, so two concurrent refunds
 * cannot exceed the refundable balance. The key `<payment id>:<amount refunded before>` is the
 * provider idempotency key and the accounting entry id of this refund.
 */
function reserveRefund(db: Db, companyId: string | null, paymentId: string, amountMinor: number): { payment: PaymentRow; key: string } {
  const payment = getCompanyPayment(db, companyId, paymentId);
  if (payment.status !== "confirmed") throw new ApiError(409, "bad_status", "Seul un paiement confirmé peut être remboursé.");
  if (amountMinor <= 0 || amountMinor > payment.amount_minor - payment.refunded_minor) {
    throw new ApiError(400, "amount_exceeds_balance", "Montant supérieur au solde remboursable.");
  }
  run(db, "UPDATE payments SET refunded_minor = refunded_minor + ? WHERE id = ?", amountMinor, payment.id);
  return { payment, key: `${payment.id}:${payment.refunded_minor}` };
}

export async function refundPayment(
  db: Db,
  connectors: ConnectorSet,
  user: Actor,
  paymentId: string,
  amountMinor: number,
  reason: string,
  now: Date = new Date(),
): Promise<PaymentRow> {
  const companyId = companyOf(user);
  const { payment, key } = transaction(db, () => reserveRefund(db, companyId, paymentId, amountMinor));

  let refundRef: string;
  try {
    ({ refundRef } = await connectors.payments[payment.method].refund(payment.provider_ref, amountMinor, key));
  } catch (error) {
    // The provider refused: release the reservation.
    run(db, "UPDATE payments SET refunded_minor = refunded_minor - ? WHERE id = ?", amountMinor, payment.id);
    throw error;
  }

  transaction(db, () => {
    const refunded = getCompanyPayment(db, companyId, paymentId);
    if (refunded.refunded_minor >= refunded.amount_minor) run(db, "UPDATE payments SET status = 'refunded' WHERE id = ?", payment.id);
    touchPayment(db, payment.id, now);
    run(db, "UPDATE invoices SET refunded_minor = refunded_minor + ? WHERE id = ?", amountMinor, payment.invoice_id);
    refreshInvoiceStatus(db, payment.invoice_id);
    const invoice = get<{ id: string; number: string }>(db, "SELECT id, number FROM invoices WHERE id = ?", payment.invoice_id)!;
    queueAccountingEntry(
      db,
      companyId!,
      "refund",
      key,
      `Remboursement ${invoice.number}`,
      -amountMinor,
      { invoice: invoice.number, providerRef: payment.provider_ref, refundRef, amountMinor, reason },
      now,
    );
    resolveExceptions(db, companyId!, ["overpayment"], invoice.id, "Remboursement effectué.", now);
    recordAudit(
      db,
      user,
      "payment.refunded",
      "payment",
      payment.id,
      { invoice: invoice.number, amountMinor, reason, refundRef },
      companyId,
      now,
    );
  });
  return getCompanyPayment(db, companyId, paymentId);
}
