// Labels shared by the head office and finance screens.
// The tables are translated once, when the module loads: the language only changes with a reload.
import { getLanguage } from "../i18n/language.ts";
import { translate } from "../i18n/translate.ts";
import { formatMoney } from "../shared/format.ts";
import { PAYMENT_CHANNEL } from "../shared/labels.ts";
import type { ExceptionItem } from "./types.ts";

/** Stock movement type → label. */
export const STOCK_MOVEMENT_LABELS: Record<string, string> = {
  load: translate(`Chargement véhicule`),
  delivery: translate(`Livraison`),
  sale: translate(`Vente sur place`),
  return: translate(`Retour client (véhicule)`),
  unload: translate(`Retour au dépôt`),
  return_in: translate(`Retours clients à contrôler`),
  adjust: translate(`Ajustement`),
};

/** Accounting-software (ERP) entry kind → label, for the distribution entries of an order chain. */
export const ERP_ENTRY_KIND_LABELS: Record<string, string> = {
  invoice: translate(`Facture`),
  payment: translate(`Encaissement`),
  settlement: translate(`Règlement bancaire`),
  refund: translate(`Remboursement`),
};

/** English names of the exception detail fields shown instead of the (French) server message. */
export const EXCEPTION_DETAIL_LABELS: Record<string, string> = {
  order: `Order`,
  customerOutlet: `Outlet`,
  reason: `Reason`,
  invoice: `Invoice`,
  reference: `Reference`,
  providerRef: `Reference`,
  method: `Method`,
  amountMinor: `Amount`,
  returnsMinor: `Returns`,
  shownMinor: `Shown to agent`,
  invoicedMinor: `Invoiced`,
  notifiedMinor: `Notified`,
  expectedMinor: `Expected`,
  paidMinor: `Collected`,
  grossMinor: `Credited`,
  creditedMinor: `Credited`,
  feeMinor: `Fee charged`,
  valueDate: `Value date`,
  qty: `Quantity`,
  error: `Error`,
  member: `Member`,
  label: `Bank label`,
};

/**
 * Text describing an exception. The server writes its message in French; in English it is rebuilt
 * from the structured details (amounts formatted, payment methods named), falling back to the
 * French message when no known detail is present.
 */
export function describeException(exception: Pick<ExceptionItem, "message" | "details">): string {
  if (getLanguage() === `fr`) return exception.message;
  const parts = Object.entries(exception.details ?? {})
    .filter((entry): entry is [string, string | number] => {
      const [key, value] = entry;
      return Boolean(EXCEPTION_DETAIL_LABELS[key]) && (typeof value == `string` || typeof value == `number`);
    })
    .map(([key, value]) => {
      const shown = key.endsWith(`Minor`)
        ? formatMoney(Number(value))
        : key === `method`
          ? (PAYMENT_CHANNEL[String(value)] ?? value)
          : translate(String(value));
      return `${EXCEPTION_DETAIL_LABELS[key]}: ${shown}`;
    });
  return parts.join(` · `) || exception.message;
}
