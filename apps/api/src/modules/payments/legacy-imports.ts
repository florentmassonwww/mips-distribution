// Typed bindings to functions of modules not rewritten yet (removed once they are).
// Bound at call time: the legacy modules form import cycles with this one.
// @ts-expect-error -- legacy module without type declarations
import * as distribution from "../../legacy/distribution.mjs";
// @ts-expect-error -- legacy module without type declarations
import * as club from "../../legacy/club.mjs";
import type { Db } from "../../core/db.ts";
import type { ErpSettings, PaymentMethod, PaymentNotification } from "../connectors/index.ts";
import type { PaymentRow } from "./types.ts";

export interface PaymentMethodSettings {
  enabled: boolean;
  /** Expected provider fee, in basis points of the paid amount. */
  feeBps: number;
  merchantRef: string;
}

/** Subset of the company settings (defaults merged with companies.settings_json) used here. */
export interface CompanySettings {
  payments: {
    methods: Record<PaymentMethod, PaymentMethodSettings>;
    settlementAccountLabel: string;
    /** Minutes after which a pending attempt without answer becomes "to verify". */
    attemptMinutes: number;
  };
  erp: ErpSettings;
}

export function companySettings(db: Db, companyId: string | null): CompanySettings {
  return distribution.Xu(db, companyId);
}

/** Opens a finance exception, unless one is already open for the same type and entity. */
export function openException(
  db: Db,
  companyId: string,
  domain: "ops" | "finance",
  type: string,
  entity: string,
  entityId: string,
  message: string,
  details: unknown = {},
  now: Date = new Date(),
): void {
  distribution.U(db, companyId, domain, type, entity, entityId, message, details, now);
}

/** Resolves automatically the open exceptions of these types on an entity. */
export function resolveExceptions(db: Db, companyId: string, types: string[], entityId: string, note: string, now: Date = new Date()): void {
  distribution.ed(db, companyId, types, entityId, note, now);
}

/** Queues an accounting entry; idempotent on (company, kind, entity). */
export function queueAccountingEntry(
  db: Db,
  companyId: string,
  kind: string,
  entityId: string,
  label: string,
  amountMinor: number,
  payload: unknown,
  now: Date = new Date(),
): void {
  distribution.W(db, companyId, kind, entityId, label, amountMinor, payload, now);
}

/** Payment of the company, or 404 "Paiement introuvable.". */
export function getCompanyPayment(db: Db, companyId: string | null, paymentId: string): PaymentRow {
  return club.np(db, companyId, paymentId);
}

/** Public JSON view of a payment. */
export function paymentView(payment: PaymentRow): Record<string, unknown> {
  return club.rp(payment);
}

export interface NotificationOutcome {
  result: string;
  paymentId: string | null;
  companyId: string | null;
}

/** Applies a notification to a club member payment; null when the reference is not one. */
export function applyMemberPaymentNotification(
  db: Db,
  method: PaymentMethod,
  notification: PaymentNotification,
  now: Date,
): NotificationOutcome | null {
  return club.Of(db, method, notification, now);
}
