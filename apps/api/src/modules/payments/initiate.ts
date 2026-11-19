// Payment initiation. Two guards against double debits: the idempotency key (a retried request
// returns the same attempt) and at most one attempt in progress per invoice.
import type { SessionUser } from "../../core/actor.ts";
import { recordAudit } from "../../core/audit.ts";
import { type Db, get, run, transaction } from "../../core/db.ts";
import { ApiError, notFound } from "../../core/errors.ts";
import { newId, newToken } from "../../core/ids.ts";
import { iso } from "../../core/time.ts";
import type { ConnectorSet } from "../connectors/index.ts";
import { type CompanySettings, companySettings, getCompanyPayment } from "./legacy-imports.ts";
import { failPayment, refreshInvoiceStatus } from "./lifecycle.ts";
import { assertInvoiceAccess } from "./lookups.ts";
import type { CreatePaymentInput } from "./schemas.ts";
import type { InvoiceRow, PaymentRow, PaymentStatus } from "./types.ts";

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
  user: SessionUser,
  input: CreatePaymentInput,
  settings: CompanySettings,
  expiresAt: Date,
  now: Date,
): CreatedAttempt {
  const companyId = user.companyId;
  const invoice = get<InvoiceRow>(db, "SELECT * FROM invoices WHERE id = ? AND company_id = ?", input.invoiceId, companyId);
  if (!invoice) throw notFound("Facture");
  assertInvoiceAccess(db, user, invoice);

  const previous = get<PaymentRow>(db, "SELECT * FROM payments WHERE company_id = ? AND idempotency_key = ?", companyId, input.idempotencyKey);
  if (previous) {
    if (previous.invoice_id !== invoice.id || previous.amount_minor !== input.amountMinor || previous.method !== input.method) {
      throw new ApiError(409, "idempotency_conflict", "Cette clé d'idempotence a déjà servi pour une autre demande.");
    }
    return { payment: previous, invoice, replayed: true };
  }

  if (!settings.payments.methods[input.method].enabled) {
    throw new ApiError(400, "method_disabled", "Ce moyen de paiement n'est pas activé pour l'entreprise.");
  }
  const inProgress = get<{ status: PaymentStatus }>(
    db,
    "SELECT status FROM payments WHERE invoice_id = ? AND status IN ('pending','to_verify')",
    invoice.id,
  );
  if (inProgress) {
    throw new ApiError(
      409,
      "attempt_in_progress",
      inProgress.status === "pending"
        ? "Un paiement est déjà en attente pour cette facture. Vérifiez son statut avant d'en lancer un autre."
        : "Un paiement est à vérifier pour cette facture : nouvelle tentative bloquée pour éviter un double débit.",
    );
  }
  const balance = invoice.amount_minor - (invoice.paid_minor - invoice.refunded_minor);
  if (balance <= 0) throw new ApiError(409, "already_paid", "Cette facture est déjà payée.");
  if (input.amountMinor > balance) throw new ApiError(400, "amount_exceeds_balance", "Le montant dépasse le solde restant dû.");

  // Random draws, in this order: payment id, then the public link token (link method only).
  const paymentId = newId("pay");
  run(
    db,
    `INSERT INTO payments (id, company_id, invoice_id, order_id, agent_id, method, amount_minor, currency, status, idempotency_key, link_token, created_at, updated_at, expires_at)
      VALUES (?,?,?,?,?,?,?,?,'pending',?,?,?,?,?)`,
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
  user: SessionUser,
  input: CreatePaymentInput,
  origin: string,
  now: Date = new Date(),
): Promise<InitiatePaymentResult> {
  const companyId = user.companyId;
  const settings = companySettings(db, companyId);
  const provider = connectors.payments[input.method];
  const expiresAt = new Date(now.getTime() + settings.payments.attemptMinutes * 60_000);
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
