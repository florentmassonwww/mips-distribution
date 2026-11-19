// Contract between the application and its external systems (payment providers, bank statements,
// accounting software, gate access). The only implementations today are SIMULATED (demo mode);
// a real provider adapter must implement the same interfaces. Meant to move to packages/connectors.

/** Payment methods, in display order. */
export const PAYMENT_METHODS = ["paystation", "card_tpe", "juice", "link"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** What a provider supports; drives which actions the application offers. */
export interface ProviderCapabilities {
  onSite: boolean;
  remote: boolean;
  refund: boolean;
  cancel: boolean;
  statusQuery: boolean;
}

/** How the payment request is shown to the customer (QR code, terminal, app request, link). */
export interface PaymentPresentation {
  kind: "qr" | "terminal" | "app_request" | "url";
  value: string;
  instructions: string;
}

export interface InitiatePaymentRequest {
  paymentId: string;
  /** Stable key of the attempt: a provider must not create two transactions for the same key. */
  idempotencyKey: string;
  companyId: string;
  merchantRef: string;
  amountMinor: number;
  currency: string;
  invoiceNumber: string;
  /** Hosted payment page, for the `link` method only. */
  payUrl?: string;
  expiresAt: Date;
}

export interface InitiatePaymentResult {
  providerRef: string;
  presentation: PaymentPresentation;
}

/** Status of a transaction as known by the provider; `unknown` when it has no such reference. */
export type ProviderStatus = "pending" | "succeeded" | "failed" | "unknown";

export type NotificationType = "payment.succeeded" | "payment.failed";

/** A provider notification whose signature has been verified. */
export interface PaymentNotification {
  eventId: string;
  type: NotificationType;
  providerRef: string;
  amountMinor: number;
  currency: string;
  occurredAt: string;
  failureReason?: string;
}

/** Raw notification as it would be POSTed to the webhook endpoint. */
export interface SignedNotification {
  rawBody: string;
  signature: string;
}

export interface PaymentProvider {
  readonly demo: boolean;
  readonly method: PaymentMethod;
  readonly label: string;
  readonly capabilities: ProviderCapabilities;
  /** Points to confirm with the real provider before going live (shown to administrators). */
  readonly toVerify: string[];
  initiate(request: InitiatePaymentRequest): Promise<InitiatePaymentResult>;
  queryStatus(providerRef: string): Promise<ProviderStatus>;
  /** True when the provider guarantees the pending request can no longer be paid. */
  cancel(providerRef: string): Promise<boolean>;
  refund(providerRef: string | null, amountMinor: number, idempotencyKey: string): Promise<{ refundRef: string }>;
  verifyNotification(rawBody: string, signature: string | undefined, now: Date): PaymentNotification;
}

/** Outcomes a demo user can trigger on a simulated payment. */
export type SimulatedOutcome = "success" | "failure" | "lost_notification" | "duplicate" | "wrong_amount";

/** Simulated provider: also lets the demo decide the outcome of a pending payment. */
export interface SimulatedPaymentProvider extends PaymentProvider {
  /** Returns the notification the provider would send, or null when it is "lost". */
  simulate(providerRef: string, outcome: SimulatedOutcome, now: Date): SignedNotification | null;
}

/** One credit line of a bank statement, amounts in minor units. */
export interface StatementLine {
  valueDate: string;
  reference: string;
  label: string;
  grossMinor: number;
  feeMinor: number;
  netMinor: number;
}

export interface BankStatementFormat {
  readonly label: string;
  readonly demo: boolean;
  readonly toVerify: string[];
  parse(content: string): StatementLine[];
}

/** Accounting software settings of a company (`settings.erp`). */
export interface ErpSettings {
  system: string;
  endpoint: string;
  secretRef: string;
  autoSync: boolean;
  simulateFailure: boolean;
}

export interface AccountingEntry {
  id: string;
  kind: string;
  companyId: string;
  entityId: string;
  label: string;
  amountMinor: number;
  payload: unknown;
}

export interface AccountingSoftware {
  readonly label: string;
  readonly demo: boolean;
  readonly toVerify: string[];
  push(entry: AccountingEntry, settings: ErpSettings): Promise<{ externalRef: string }>;
}

/** A badge read by a gate reader, after signature verification. */
export interface GateRequest {
  requestId: string;
  credential: string;
  occurredAt: string;
}

export interface GateAccess {
  readonly label: string;
  readonly demo: boolean;
  readonly toVerify: string[];
  /** `secret` is the reader's own secret (each gate device signs with its key). */
  verifyRequest(rawBody: string, signature: string | undefined, secret: string, now: Date): GateRequest;
}

export interface ConnectorSet<P extends PaymentProvider = PaymentProvider> {
  payments: Record<PaymentMethod, P>;
  bank: BankStatementFormat;
  erp: AccountingSoftware;
  access: GateAccess;
}

/** Connector set of demo mode, where every payment provider is simulated. */
export type DemoConnectorSet = ConnectorSet<SimulatedPaymentProvider>;
