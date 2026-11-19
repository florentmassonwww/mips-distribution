// Following up a payment attempt: status query to the provider, cancellation, customer claim.
import type { SessionUser } from "../../core/actor.ts";
import { type Db, transaction } from "../../core/db.ts";
import { ApiError } from "../../core/errors.ts";
import { iso } from "../../core/time.ts";
import type { ConnectorSet, ProviderStatus } from "../connectors/index.ts";
import { getCompanyPayment } from "./legacy-imports.ts";
import { confirmPayment, failPayment, markToVerify } from "./lifecycle.ts";
import { getPaymentForUser } from "./lookups.ts";
import type { PaymentRow } from "./types.ts";

const REFUSED_BY_PROVIDER = "Refusé ou annulé chez le prestataire.";

/** Applies the provider's answer to a status query. Runs inside a transaction, on a fresh row. */
function applyProviderStatus(db: Db, payment: PaymentRow, status: ProviderStatus, user: SessionUser, now: Date): void {
  if (status === "succeeded") confirmPayment(db, payment, "status_query", user, now);
  else if (status === "failed") failPayment(db, payment, REFUSED_BY_PROVIDER, user, now);
  else if (status === "unknown") markToVerify(db, payment, "Le prestataire ne connaît pas cette référence.", user, now);
  // Still pending at the provider: past the attempt deadline, a human has to check it.
  else if (payment.expires_at && iso(now) > payment.expires_at) {
    markToVerify(db, payment, "Sans réponse du prestataire après expiration du délai.", user, now);
  }
}

/** Asks the provider for the status of an attempt in progress and applies the answer. */
export async function checkPaymentStatus(
  db: Db,
  connectors: ConnectorSet,
  user: SessionUser,
  paymentId: string,
  now: Date = new Date(),
): Promise<PaymentRow> {
  const companyId = user.companyId;
  const payment = getPaymentForUser(db, user, paymentId);
  if ((payment.status === "pending" || payment.status === "to_verify") && payment.provider_ref) {
    const status = await connectors.payments[payment.method].queryStatus(payment.provider_ref);
    transaction(db, () => applyProviderStatus(db, getCompanyPayment(db, companyId, paymentId), status, user, now));
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
  user: SessionUser,
  paymentId: string,
  now: Date = new Date(),
): Promise<PaymentRow> {
  const companyId = user.companyId;
  const payment = getPaymentForUser(db, user, paymentId);
  if (payment.status !== "pending") throw new ApiError(409, "bad_status", "Seule une tentative en attente peut être annulée.");

  const provider = connectors.payments[payment.method];
  // Without a provider reference, the provider never received the request.
  const cancelled = !payment.provider_ref || (await provider.cancel(payment.provider_ref));
  const status: ProviderStatus = cancelled || !payment.provider_ref ? "failed" : await provider.queryStatus(payment.provider_ref);
  transaction(db, () => {
    const fresh = getCompanyPayment(db, companyId, paymentId);
    if (cancelled) failPayment(db, fresh, "Annulée par l'utilisateur avant paiement.", user, now);
    else if (status === "succeeded") confirmPayment(db, fresh, "status_query", user, now);
    else if (status === "failed") failPayment(db, fresh, REFUSED_BY_PROVIDER, user, now);
    else markToVerify(db, fresh, "Annulation non garantie par le prestataire : le client peut encore payer.", user, now);
  });
  return getCompanyPayment(db, companyId, paymentId);
}

/** The customer shows a proof of payment (e.g. a screenshot): never a confirmation, only "to verify". */
export function claimPayment(db: Db, user: SessionUser, paymentId: string, now: Date = new Date()): PaymentRow {
  const companyId = user.companyId;
  return transaction(db, () => {
    const payment = getPaymentForUser(db, user, paymentId);
    if (payment.status !== "pending") throw new ApiError(409, "bad_status", "Cette tentative n'est plus en attente.");
    markToVerify(db, payment, "Preuve présentée par le client (capture d'écran) sans confirmation du prestataire.", user, now);
    return getCompanyPayment(db, companyId, paymentId);
  });
}
