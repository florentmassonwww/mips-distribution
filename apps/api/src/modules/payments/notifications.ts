// Provider notifications (webhooks). Processing is idempotent on (provider, event id): a
// notification delivered twice is recorded once and applied once.
import { notificationDecision } from "@mips/core";
import { SYSTEM_ACTOR } from "../../core/actor.ts";
import { type Db, get, run, transaction } from "../../core/db.ts";
import { newId } from "../../core/ids.ts";
import { iso } from "../../core/time.ts";
import type { ConnectorSet, PaymentMethod, PaymentNotification } from "../connectors/index.ts";
import { applyMemberPaymentNotification } from "../club/member-payments.ts";
import { raiseException as openException } from "../distribution/exceptions.ts";
import { confirmPayment, failPayment, markToVerify } from "./lifecycle.ts";
import type { PaymentRow } from "./types.ts";

/** Result of processing one provider notification. */
export interface NotificationOutcome {
  result: string;
  paymentId: string | null;
  companyId: string | null;
}

function recordEvent(
  db: Db,
  method: PaymentMethod,
  notification: PaymentNotification,
  outcome: NotificationOutcome,
  now: Date,
): void {
  run(
    db,
    "INSERT INTO payment_events (id, provider, event_id, company_id, payment_id, type, payload_json, result, received_at) VALUES (?,?,?,?,?,?,?,?,?)",
    newId("evt"),
    method,
    notification.eventId,
    outcome.companyId,
    outcome.paymentId,
    notification.type,
    JSON.stringify(notification),
    outcome.result,
    iso(now),
  );
}

/** Applies a verified notification to an invoice payment and returns the recorded result. */
function applyToPayment(db: Db, method: PaymentMethod, notification: PaymentNotification, payment: PaymentRow, now: Date): string {
  // Never confirm an amount or currency other than requested: a human checks it.
  const decision = notificationDecision({ amountMinor: payment.amount_minor, currency: payment.currency }, notification);
  if (decision.action === "to_verify") {
    markToVerify(db, payment, decision.reason, SYSTEM_ACTOR, now);
    openException(
      db,
      payment.company_id,
      "finance",
      "amount_mismatch",
      "payment",
      payment.id,
      `Notification ${method} incohérente : ${notification.amountMinor / 100} ${notification.currency} notifié pour ${payment.amount_minor / 100} ${payment.currency} demandé.`,
      { providerRef: payment.provider_ref, notifiedMinor: notification.amountMinor, expectedMinor: payment.amount_minor },
      now,
    );
    return "amount_mismatch";
  }
  if (decision.action === "confirm") {
    return confirmPayment(db, payment, "notification", SYSTEM_ACTOR, now) ? "confirmed" : "already_confirmed";
  }
  if (decision.action === "fail" && failPayment(db, payment, decision.reason, SYSTEM_ACTOR, now)) return "failed";
  if (payment.status === "confirmed") {
    openException(
      db,
      payment.company_id,
      "finance",
      "conflicting_notification",
      "payment",
      payment.id,
      "Échec notifié pour un paiement déjà confirmé : à contrôler avec le prestataire.",
      { providerRef: payment.provider_ref },
      now,
    );
  }
  return "ignored";
}

/**
 * Verifies (signature, freshness, shape) and processes a provider notification. The reference may
 * belong to an invoice payment or to a club member payment.
 */
export function processNotification(
  db: Db,
  connectors: ConnectorSet,
  method: PaymentMethod,
  rawBody: string,
  signature: string | undefined,
  now: Date = new Date(),
): NotificationOutcome {
  const notification = connectors.payments[method].verifyNotification(rawBody, signature, now);
  return transaction(db, () => {
    const known = get<{ payment_id: string | null; company_id: string | null }>(
      db,
      "SELECT payment_id, company_id FROM payment_events WHERE provider = ? AND event_id = ?",
      method,
      notification.eventId,
    );
    if (known) return { result: "duplicate", paymentId: known.payment_id, companyId: known.company_id };

    const payment = get<PaymentRow>(db, "SELECT * FROM payments WHERE method = ? AND provider_ref = ?", method, notification.providerRef);
    const memberOutcome = payment ? null : applyMemberPaymentNotification(db, method, notification, now);
    if (memberOutcome) {
      recordEvent(db, method, notification, memberOutcome, now);
      return { result: memberOutcome.result, paymentId: memberOutcome.paymentId, companyId: memberOutcome.companyId };
    }

    const result = payment ? applyToPayment(db, method, notification, payment, now) : "unknown_reference";
    const outcome: NotificationOutcome = { result, paymentId: payment?.id ?? null, companyId: payment?.company_id ?? null };
    recordEvent(db, method, notification, outcome, now);
    return outcome;
  });
}
