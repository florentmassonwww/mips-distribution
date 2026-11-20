// SIMULATED payment provider (demo mode only). Its "provider side" state lives in
// demo_provider_tx; the demo decides each outcome and receives the notification the provider
// would send, signed like a real one.
import { createHash } from "node:crypto";
import { type Db, get, run } from "../../core/db.ts";
import { ApiError } from "../../core/errors.ts";
import { uuidV4 } from "../../core/ids.ts";
import { iso } from "../../core/time.ts";
import { signWebhook as signPayload, verifyWebhook as verifySignature } from "./signature.ts";
import type { PaymentProviderSpec } from "./payment-providers.ts";
import type {
  InitiatePaymentRequest,
  InitiatePaymentResult,
  NotificationType,
  PaymentMethod,
  PaymentNotification,
  ProviderCapabilities,
  StatusReport,
  SignedNotification,
  SimulatedOutcome,
  SimulatedPaymentProvider,
} from "./types.ts";

interface DemoProviderTxRow {
  provider_ref: string;
  method: string;
  amount_minor: number;
  currency: string;
  status: "pending" | "succeeded" | "failed";
  /** Amount the customer actually paid (a "wrong_amount" outcome pays 1.00 less). */
  received_minor: number | null;
  refunded_minor: number;
  last_event_json: string | null;
  created_at: string;
}

/** Notification body as sent by the simulated provider (and expected from a real one). */
interface NotificationBody {
  eventId?: string;
  type?: string;
  providerRef?: string;
  amountMinor?: unknown;
  currency?: string;
  occurredAt?: string;
  failureReason?: string;
}

const shortHash = (input: string, length: number): string =>
  createHash("sha256").update(input).digest("hex").slice(0, length).toUpperCase();

export class SimulatedProvider implements SimulatedPaymentProvider {
  readonly demo = true;
  readonly method: PaymentMethod;
  readonly label: string;
  readonly capabilities: ProviderCapabilities;
  readonly toVerify: string[];
  private readonly db: Db;
  private readonly spec: PaymentProviderSpec;
  private readonly secret: string;
  private readonly toleranceSeconds: number;

  constructor(db: Db, spec: PaymentProviderSpec, secret: string, toleranceSeconds: number) {
    this.db = db;
    this.spec = spec;
    this.secret = secret;
    this.toleranceSeconds = toleranceSeconds;
    this.method = spec.method;
    this.label = spec.label;
    this.capabilities = spec.capabilities;
    this.toVerify = spec.toVerify;
  }

  private transaction(providerRef: string | null): DemoProviderTxRow | undefined {
    return get<DemoProviderTxRow>(
      this.db,
      "SELECT * FROM demo_provider_tx WHERE provider_ref = ? AND method = ?",
      providerRef,
      this.method,
    );
  }

  async initiate(request: InitiatePaymentRequest): Promise<InitiatePaymentResult> {
    // The reference derives from the idempotency key, so a retried initiation maps to the same
    // provider transaction (INSERT OR IGNORE) instead of creating a second one.
    const providerRef = `${this.spec.prefix}-DEMO-${shortHash(`${request.companyId}:${request.idempotencyKey}`, 10)}`;
    run(
      this.db,
      "INSERT OR IGNORE INTO demo_provider_tx (provider_ref, method, amount_minor, currency, status, created_at) VALUES (?,?,?,?,'pending',?)",
      providerRef,
      this.method,
      request.amountMinor,
      request.currency,
      iso(new Date()),
    );
    return { providerRef, presentation: this.spec.present(request, providerRef) };
  }

  async queryStatus(providerRef: string): Promise<StatusReport> {
    const tx = this.transaction(providerRef);
    if (!tx) return { status: "unknown", amountMinor: null, currency: null };
    return { status: tx.status, amountMinor: tx.status === "succeeded" ? (tx.received_minor ?? tx.amount_minor) : null, currency: tx.currency };
  }

  async cancel(providerRef: string): Promise<boolean> {
    if (!this.capabilities.cancel) return false;
    return (
      run(
        this.db,
        "UPDATE demo_provider_tx SET status = 'failed' WHERE provider_ref = ? AND method = ? AND status = 'pending'",
        providerRef,
        this.method,
      ) === 1
    );
  }

  async refund(providerRef: string | null, amountMinor: number, idempotencyKey: string): Promise<{ refundRef: string }> {
    const tx = this.transaction(providerRef);
    if (!tx || tx.status !== "succeeded") {
      throw new ApiError(409, "provider_refused", "Le prestataire refuse le remboursement : paiement non confirmé chez lui.");
    }
    if (tx.refunded_minor + amountMinor > tx.amount_minor) {
      throw new ApiError(409, "provider_refused", "Le prestataire refuse : montant supérieur au solde remboursable.");
    }
    run(this.db, "UPDATE demo_provider_tx SET refunded_minor = refunded_minor + ? WHERE provider_ref = ?", amountMinor, providerRef);
    return { refundRef: `RF-DEMO-${shortHash(idempotencyKey, 10)}` };
  }

  verifyNotification(rawBody: string, signature: string | undefined, now: Date): PaymentNotification {
    verifySignature(this.secret, rawBody, signature, now, this.toleranceSeconds);
    const body = JSON.parse(rawBody) as NotificationBody;
    if (
      !body.eventId ||
      !body.providerRef ||
      !Number.isInteger(body.amountMinor) ||
      !body.currency ||
      (body.type !== "payment.succeeded" && body.type !== "payment.failed")
    ) {
      throw new ApiError(400, "invalid_notification", "Notification incomplète.");
    }
    // Key order matters: the result is stored as JSON in payment_events.
    return {
      eventId: body.eventId,
      type: body.type,
      providerRef: body.providerRef,
      amountMinor: body.amountMinor as number,
      currency: body.currency,
      occurredAt: body.occurredAt ?? iso(now),
      failureReason: body.failureReason,
    };
  }

  simulate(providerRef: string, outcome: SimulatedOutcome, now: Date): SignedNotification | null {
    const tx = this.transaction(providerRef);
    if (!tx) throw new ApiError(404, "not_found", "Transaction inconnue du prestataire simulé.");

    // A provider may deliver the same event twice: resend the last one, unchanged.
    if (outcome === "duplicate") {
      if (!tx.last_event_json) {
        throw new ApiError(409, "nothing_to_replay", "Aucune notification à renvoyer pour ce paiement.");
      }
      return { rawBody: tx.last_event_json, signature: signPayload(this.secret, tx.last_event_json, now) };
    }
    if (tx.status !== "pending") {
      throw new ApiError(409, "already_final", "Le prestataire simulé a déjà une issue pour ce paiement.");
    }

    // Every outcome but "failure" is a payment the customer actually made.
    const succeeded = outcome !== "failure";
    // "wrong_amount": the provider received, and reports, 1.00 less than requested.
    const receivedMinor = outcome === "wrong_amount" ? tx.amount_minor - 100 : tx.amount_minor;
    run(
      this.db,
      "UPDATE demo_provider_tx SET status = ?, received_minor = ? WHERE provider_ref = ?",
      succeeded ? "succeeded" : "failed",
      succeeded ? receivedMinor : null,
      providerRef,
    );
    // Paid, but the notification never arrives: only a status query or the statement reveals it.
    if (outcome === "lost_notification") return null;

    const type: NotificationType = succeeded ? "payment.succeeded" : "payment.failed";
    const rawBody = JSON.stringify({
      eventId: `evt_demo_${uuidV4()}`,
      type,
      providerRef,
      amountMinor: receivedMinor,
      currency: tx.currency,
      occurredAt: iso(now),
      ...(succeeded ? {} : { failureReason: "Refusé par l'émetteur (simulation)" }),
    });
    run(this.db, "UPDATE demo_provider_tx SET last_event_json = ? WHERE provider_ref = ?", rawBody, providerRef);
    return { rawBody, signature: signPayload(this.secret, rawBody, now) };
  }
}
