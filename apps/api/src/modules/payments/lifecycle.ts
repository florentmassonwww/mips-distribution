// State transitions of a payment attempt, and their effects on the invoice, the accounting
// entries, the finance exceptions and the audit log. Callers run them inside a transaction.
import type { Actor } from "../../core/actor.ts";
import { recordAudit } from "../../core/audit.ts";
import { type Db, get, run } from "../../core/db.ts";
import { iso } from "../../core/time.ts";
import { companySettings, openException, queueAccountingEntry, resolveExceptions } from "./legacy-imports.ts";
import type { ConfirmationSource, InvoiceRow, InvoiceStatus, PaymentRow, PaymentStatus } from "./types.ts";

/**
 * Recomputes the invoice status from its payments. An attempt in progress wins over amounts:
 * "to verify" first (a possible double debit), then "pending".
 */
export function refreshInvoiceStatus(db: Db, invoiceId: string): InvoiceStatus {
  const invoice = get<InvoiceRow>(db, "SELECT * FROM invoices WHERE id = ?", invoiceId)!;
  const hasPayment = (status: PaymentStatus): boolean =>
    !!get(db, "SELECT 1 FROM payments WHERE invoice_id = ? AND status = ?", invoiceId, status);
  const collected = invoice.paid_minor - invoice.refunded_minor;
  const lastStatus = get<{ status: PaymentStatus }>(
    db,
    "SELECT status FROM payments WHERE invoice_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1",
    invoiceId,
  )?.status;
  const status: InvoiceStatus = hasPayment("to_verify")
    ? "to_verify"
    : hasPayment("pending")
      ? "pending"
      : collected >= invoice.amount_minor
        ? "paid"
        : collected > 0
          ? "partially_paid"
          : invoice.paid_minor > 0
            ? "refunded"
            : lastStatus === "failed"
              ? "failed"
              : "unpaid";
  run(db, "UPDATE invoices SET status = ? WHERE id = ?", status, invoiceId);
  return status;
}

export function touchPayment(db: Db, paymentId: string, now: Date): void {
  run(db, "UPDATE payments SET updated_at = ? WHERE id = ?", iso(now), paymentId);
}

/** Expected provider fee, rounded to the minor unit, on the full amount of the attempt. */
export function expectedFee(amountMinor: number, feeBps: number): number {
  return Math.round((amountMinor * feeBps) / 1e4);
}

/** Confirms the payment (provider proof only). False when it was already confirmed or refunded. */
export function confirmPayment(db: Db, payment: PaymentRow, via: ConfirmationSource, actor: Actor, now: Date): boolean {
  if (payment.status === "confirmed" || payment.status === "refunded") return false;
  const fee = expectedFee(payment.amount_minor, companySettings(db, payment.company_id).payments.methods[payment.method].feeBps);
  run(
    db,
    "UPDATE payments SET status = 'confirmed', confirmed_at = ?, confirmed_via = ?, fee_expected_minor = ?, failure_reason = NULL, verify_reason = NULL WHERE id = ?",
    iso(now),
    via,
    fee,
    payment.id,
  );
  touchPayment(db, payment.id, now);
  run(db, "UPDATE invoices SET paid_minor = paid_minor + ? WHERE id = ?", payment.amount_minor, payment.invoice_id);
  refreshInvoiceStatus(db, payment.invoice_id);

  const invoice = get<InvoiceRow>(db, "SELECT * FROM invoices WHERE id = ?", payment.invoice_id)!;
  queueAccountingEntry(
    db,
    payment.company_id,
    "payment",
    payment.id,
    `Encaissement ${invoice.number} (${payment.method})`,
    payment.amount_minor,
    {
      invoice: invoice.number,
      method: payment.method,
      providerRef: payment.provider_ref,
      amountMinor: payment.amount_minor,
      currency: payment.currency,
      confirmedVia: via,
    },
    now,
  );
  resolveExceptions(db, payment.company_id, ["payment_to_verify", "amount_mismatch"], payment.id, `Confirmé (${via}).`, now);
  const collected = invoice.paid_minor - invoice.refunded_minor;
  if (collected > invoice.amount_minor) {
    openException(
      db,
      payment.company_id,
      "finance",
      "overpayment",
      "invoice",
      invoice.id,
      `Facture ${invoice.number} encaissée au-delà de son montant : remboursement à prévoir.`,
      { invoice: invoice.number, amountMinor: invoice.amount_minor, paidMinor: collected },
      now,
    );
  }
  recordAudit(
    db,
    actor,
    "payment.confirmed",
    "payment",
    payment.id,
    { invoice: invoice.number, method: payment.method, amountMinor: payment.amount_minor, via },
    payment.company_id,
    now,
  );
  return true;
}

/** Marks a pending or to-verify attempt as failed. False otherwise. */
export function failPayment(db: Db, payment: PaymentRow, reason: string, actor: Actor, now: Date): boolean {
  if (payment.status !== "pending" && payment.status !== "to_verify") return false;
  run(db, "UPDATE payments SET status = 'failed', failure_reason = ?, verify_reason = NULL WHERE id = ?", reason, payment.id);
  touchPayment(db, payment.id, now);
  refreshInvoiceStatus(db, payment.invoice_id);
  resolveExceptions(db, payment.company_id, ["payment_to_verify"], payment.id, "Échec confirmé par le prestataire.", now);
  recordAudit(
    db,
    actor,
    "payment.failed",
    "payment",
    payment.id,
    { method: payment.method, amountMinor: payment.amount_minor, reason },
    payment.company_id,
    now,
  );
  return true;
}

/**
 * Puts a pending attempt "to verify": the outcome is uncertain, so a new attempt stays blocked
 * (risk of double debit) until finance checks it. False when the attempt is not pending.
 */
export function markToVerify(db: Db, payment: PaymentRow, reason: string, actor: Actor, now: Date): boolean {
  if (payment.status !== "pending") return false;
  run(db, "UPDATE payments SET status = 'to_verify', verify_reason = ? WHERE id = ?", reason, payment.id);
  touchPayment(db, payment.id, now);
  refreshInvoiceStatus(db, payment.invoice_id);
  const invoice = get<{ number: string }>(db, "SELECT number FROM invoices WHERE id = ?", payment.invoice_id)!;
  openException(
    db,
    payment.company_id,
    "finance",
    "payment_to_verify",
    "payment",
    payment.id,
    `Paiement à vérifier sur ${invoice.number} (${payment.method}) : ${reason}`,
    { invoice: invoice.number, method: payment.method, amountMinor: payment.amount_minor, providerRef: payment.provider_ref },
    now,
  );
  recordAudit(
    db,
    actor,
    "payment.to_verify",
    "payment",
    payment.id,
    { invoice: invoice.number, method: payment.method, reason },
    payment.company_id,
    now,
  );
  return true;
}
