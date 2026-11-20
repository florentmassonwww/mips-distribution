// Payment initiation. Two guards against double debits: the idempotency key (a retried request
// returns the same attempt) and at most one attempt in progress per invoice.
import { attemptDeadline, checkNewAttempt, checkReplay } from "@mips/core";
import { type Actor, companyOf } from "../../core/actor.ts";
import { recordAudit } from "../../core/audit.ts";
import { type Db, get, run, transaction } from "../../core/db.ts";
import { notFound } from "../../core/errors.ts";
import { newId, newToken } from "../../core/ids.ts";
import { iso } from "../../core/time.ts";
import type { ConnectorSet } from "../connectors/index.ts";
import { type CompanySettings, readCompanySettings as companySettings } from "../distribution/settings.ts";
import { requireCompanyPayment as getCompanyPayment } from "./payment-view.ts";
import { failPayment, refreshInvoiceStatus } from "./lifecycle.ts";
import { assertInvoiceAccess } from "./lookups.ts";
import type { CreatePaymentInput } from "./schemas.ts";
import type { InvoiceRow, PaymentRow } from "./types.ts";

export interface InitiatePaymentResult {
  payment: PaymentRow;
  /** True when the idempotency key matched an earlier attempt, returned unchanged. */
  replayed: boolean;
}

interface CreatedAttempt {
  payment: PaymentRow;
  invoice: InvoiceRow;
  replayed: boolean;
}

/** Creates the pending attempt, or finds the one created earlier with the same idempotency key. */
function createAttempt(
  db: Db,
  user: Actor,
  input: CreatePaymentInput,
  settings: CompanySettings,
  expiresAt: Date,
  now: Date,
): CreatedAttempt {
  const companyId = companyOf(user);
  const invoice = get<InvoiceRow>(db, "SELECT * FROM invoices WHERE id = ? AND company_id = ?", input.invoiceId, companyId);
  if (!invoice) throw notFound("Facture");
  assertInvoiceAccess(db, user, invoice);

  const previous = get<PaymentRow>(db, "SELECT * FROM payments WHERE company_id = ? AND idempotency_key = ?", companyId, input.idempotencyKey);
  if (previous) {
    checkReplay(
      { invoiceId: previous.invoice_id, method: previous.method, amountMinor: previous.amount_minor },
      { invoiceId: invoice.id, method: input.method, amountMinor: input.amountMinor },
    );
    return { payment: previous, invoice, replayed: true };
  }

  const inProgress = get<{ status: "pending" | "to_verify" }>(
    db,
    "SELECT status FROM payments WHERE invoice_id = ? AND status IN ('pending','to_verify')",
    invoice.id,
  );
  checkNewAttempt({
    methodEnabled: settings.payments.methods[input.method].enabled,
    inProgress: inProgress?.status ?? null,
    invoice: { amountMinor: invoice.amount_minor, paidMinor: invoice.paid_minor, refundedMinor: invoice.refunded_minor },
    amountMinor: input.amountMinor,
  });

  // Random draws, in this order: payment id, then the public link token (link method only).
  const paymentId = newId("pay");
  run(
    db,
    `INSERT INTO payments (id, company_id, invoice_id, order_id, agent_id, method, amount_minor, currency, status, idempotency_key, link_token, fee_expected_known, created_at, updated_at, expires_at)
      VALUES (?,?,?,?,?,?,?,?,'pending',?,?,?,?,?,?)`,
    paymentId,
    companyId,
    invoice.id,
    invoice.order_id,
    user.role === "agent" ? user.id : invoice.agent_id,
    input.method,
    input.amountMinor,
    invoice.currency,
    input.idempotencyKey,
    input.method === "link" ? newToken() : null,
    // Set again at confirmation, with the fee then in force.
    Number(settings.payments.methods[input.method].feeBps !== null),
    iso(now),
    iso(now),
    iso(expiresAt),
  );
  refreshInvoiceStatus(db, invoice.id);
  recordAudit(
    db,
    user,
    "payment.initiated",
    "payment",
    paymentId,
    { invoice: invoice.number, method: input.method, amountMinor: input.amountMinor },
    companyId,
    now,
  );
  return { payment: getCompanyPayment(db, companyId, paymentId), invoice, replayed: false };
}

/**
 * Starts a payment of an invoice. The attempt is committed before the provider is called; if the
 * provider cannot initiate it, the attempt is marked failed (the invoice stays payable).
 * `origin` is the public base URL of the hosted payment page links.
 */
export async function initiatePayment(
  db: Db,
  connectors: ConnectorSet,
  user: Actor,
  input: CreatePaymentInput,
  origin: string,
  now: Date = new Date(),
): Promise<InitiatePaymentResult> {
  const companyId = companyOf(user);
  const settings = companySettings(db, companyId);
  const provider = connectors.payments[input.method];
  const expiresAt = attemptDeadline(now, settings.payments.attemptMinutes);
  const attempt = transaction(db, () => createAttempt(db, user, input, settings, expiresAt, now));
  if (attempt.replayed) return { payment: attempt.payment, replayed: true };

  const payment = attempt.payment;
  try {
    const initiated = await provider.initiate({
      paymentId: payment.id,
      idempotencyKey: payment.idempotency_key,
      companyId: companyId!,
      merchantRef: settings.payments.methods[payment.method].merchantRef,
      amountMinor: payment.amount_minor,
      currency: payment.currency,
      invoiceNumber: attempt.invoice.number,
      payUrl: payment.link_token ? `${origin}/payer/${payment.link_token}` : undefined,
      expiresAt,
    });
    run(
      db,
      "UPDATE payments SET provider_ref = ?, presentation_json = ? WHERE id = ?",
      initiated.providerRef,
      JSON.stringify(initiated.presentation),
      payment.id,
    );
  } catch (error) {
    transaction(db, () => failPayment(db, payment, "Le prestataire n'a pas pu initier le paiement.", user, now));
    console.error("Initiation de paiement en échec :", error instanceof Error ? error.message : "erreur inconnue");
  }
  return { payment: getCompanyPayment(db, companyId, payment.id), replayed: false };
}
