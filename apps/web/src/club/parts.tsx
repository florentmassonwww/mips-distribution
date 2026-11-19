// Small pieces shared by several club screens.
import { REMINDER_LEVELS } from "../admin/clubLabels.ts";
import { translate } from "../i18n/translate.ts";
import { Badge, StatusBadge } from "../shared/Badge.tsx";
import { BANK_SETTLEMENT_STATUS, CONFIRMATION_SOURCE, PAYMENT_STATUS } from "../shared/labels.ts";
import type { Billing } from "./types.ts";

/** " / mois" or " / an", appended to a plan's fee. */
export const billingSuffix = (billing: Billing): string => (billing === "monthly" ? translate(" / mois") : translate(" / an"));

/** Query string of the non-empty filters, values URL-encoded, in the filters' key order. */
export function filtersQuery(filters: Record<string, string>): string {
  return Object.entries(filters)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
}

/** Member name in bold over its number. */
export function MemberCell({ name, number }: { name: string | null; number: string | null }) {
  return (
    <>
      <strong>{name}</strong>
      <div className="small muted">{number}</div>
    </>
  );
}

export function ReminderLevelBadge({ level }: { level: number }) {
  return <Badge kind={REMINDER_LEVELS[level]?.[1]}>{REMINDER_LEVELS[level]?.[0]}</Badge>;
}

interface PaymentStatusProps {
  status: string;
  confirmedVia: string | null;
  verifyReason: string | null;
  failureReason: string | null;
}

/** Payment status, how it was confirmed, and why it failed or awaits a check. */
export function PaymentStatusCell({ status, confirmedVia, verifyReason, failureReason }: PaymentStatusProps) {
  return (
    <>
      <StatusBadge map={PAYMENT_STATUS} value={status} />
      {confirmedVia && (
        <div className="small muted">
          {translate("par")} {CONFIRMATION_SOURCE[confirmedVia] ?? confirmedVia}
        </div>
      )}
      {(verifyReason ?? failureReason) && <div className="small muted">{translate(verifyReason ?? failureReason ?? "")}</div>}
    </>
  );
}

/** Bank settlement is tracked for confirmed payments that went through the bank (not cash). */
export function SettlementCell({ status, method, settlement }: { status: string; method: string; settlement: string }) {
  return status === "confirmed" && method !== "cash" ? <StatusBadge map={BANK_SETTLEMENT_STATUS} value={settlement} /> : "—";
}

/** Online payments still waiting for the provider can be queried on demand. */
export const canQueryProvider = (payment: { method: string; status: string }): boolean =>
  payment.method === "link" && (payment.status === "pending" || payment.status === "to_verify");

export const channelLabel = (channel: string): string => (channel === "email" ? "E-mail" : "SMS");
