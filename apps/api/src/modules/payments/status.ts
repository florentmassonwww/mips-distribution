// Following up a payment attempt: status query to the provider, cancellation, customer claim.
import { checkCancel, claimDecision, isInProgress, statusQueryDecision } from "@mips/core";
import { type Actor, companyOf } from "../../core/actor.ts";
import { type Db, transaction } from "../../core/db.ts";
import type { ConnectorSet, StatusReport } from "../connectors/index.ts";
import { requireCompanyPayment as getCompanyPayment } from "./payment-view.ts";
import { confirmPayment, failPayment, markToVerify } from "./lifecycle.ts";
import { getPaymentForUser } from "./lookups.ts";
import type { PaymentRow } from "./types.ts";

/** Applies the provider's answer to a status query (rule: statusQueryDecision). Inside a transaction, on a fresh row. */
function applyProviderStatus(db: Db, payment: PaymentRow, report: StatusReport, user: Actor, now: Date): void {
  const decision = statusQueryDecision(
    { status: payment.status, amountMinor: payment.amount_minor, currency: payment.currency, expiresAt: payment.expires_at },
    report,
    now,
  );
  if (decision.action === "confirm") confirmPayment(db, payment, "status_query", user, now);
  else if (decision.action === "fail") failPayment(db, payment, decision.reason, user, now);
  else if (decision.action === "to_verify") markToVerify(db, payment, decision.reason, user, now);
}

/** Asks the provider for the status of an attempt in progress and applies the answer. */
export async function checkPaymentStatus(
  db: Db,
  connectors: ConnectorSet,
  user: Actor,
  paymentId: string,
  now: Date = new Date(),
): Promise<PaymentRow> {
  const companyId = companyOf(user);
  const payment = getPaymentForUser(db, user, paymentId);
  if (isInProgress(payment.status) && payment.provider_ref) {
    const report = await connectors.payments[payment.method].queryStatus(payment.provider_ref);
    transaction(db, () => applyProviderStatus(db, getCompanyPayment(db, companyId, paymentId), report, user, now));
  }
  return getCompanyPayment(db, companyId, paymentId);
}

/**
 * Cancels a pending attempt. When the provider cannot guarantee the cancellation, the customer
 * may still pay: the attempt then follows the provider's status, or goes "to verify".
 */
export async function cancelPayment(
  db: Db,
  connectors: ConnectorSet,
  user: Actor,
  paymentId: string,
  now: Date = new Date(),
): Promise<PaymentRow> {
  const companyId = companyOf(user);
  const payment = getPaymentForUser(db, user, paymentId);
  checkCancel(payment.status);

  const provider = connectors.payments[payment.method];
  // Without a provider reference, the provider never received the request.
  const cancelled = !payment.provider_ref || (await provider.cancel(payment.provider_ref));
  const report = cancelled || !payment.provider_ref ? null : await provider.queryStatus(payment.provider_ref);
  transaction(db, () => {
    const fresh = getCompanyPayment(db, companyId, paymentId);
    if (!report) failPayment(db, fresh, "Annulée par l'utilisateur avant paiement.", user, now);
    else {
      // Not cancelled: the provider's status decides, and an attempt still open there goes to verify.
      const decision = statusQueryDecision({ status: fresh.status, amountMinor: fresh.amount_minor, currency: fresh.currency, expiresAt: null }, report, now);
      if (decision.action === "confirm") confirmPayment(db, fresh, "status_query", user, now);
      else if (decision.action === "fail") failPayment(db, fresh, decision.reason, user, now);
      else if (decision.action === "to_verify" && decision.amountMismatch) markToVerify(db, fresh, decision.reason, user, now);
      else markToVerify(db, fresh, "Annulation non garantie par le prestataire : le client peut encore payer.", user, now);
    }
  });
  return getCompanyPayment(db, companyId, paymentId);
}

/** The customer shows a proof of payment (e.g. a screenshot): never a confirmation, only "to verify". */
export function claimPayment(db: Db, user: Actor, paymentId: string, now: Date = new Date()): PaymentRow {
  const companyId = companyOf(user);
  return transaction(db, () => {
    const payment = getPaymentForUser(db, user, paymentId);
    const decision = claimDecision(payment.status);
    if (decision.action === "to_verify") markToVerify(db, payment, decision.reason, user, now);
    return getCompanyPayment(db, companyId, paymentId);
  });
}
