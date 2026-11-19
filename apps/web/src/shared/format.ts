import { getDateLocale } from "../i18n/language.ts";

// Amounts are integers in minor units (cents of Mauritian rupee).

/** "Rs 1,234.50", "−Rs 12" (true minus sign), "—" when unknown. Cents shown only when non-zero. */
export function formatMoney(minor: number | null | undefined): string {
  if (minor == null) return "—";
  const absolute = Math.abs(minor);
  const rupees = Math.trunc(absolute / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const cents = absolute % 100;
  return `${minor < 0 ? "−" : ""}Rs ${rupees}${cents ? "." + String(cents).padStart(2, "0") : ""}`;
}

/** Parses a typed amount ("1 250,5", "Rs 12.30") into minor units; null when not a valid amount. */
export function parseMoney(text: string): number | null {
  const match = /^(\d{1,9})(?:[.,](\d{1,2}))?$/.exec(text.replace(/\s|Rs/gi, ""));
  return match ? Number(match[1]) * 100 + Number((match[2] ?? "0").padEnd(2, "0")) : null;
}

/** Minor units as an editable amount: "1250.5" style without separators ("12" when no cents). */
export const formatMoneyInput = (minor: number): string =>
  `${Math.trunc(minor / 100)}${minor % 100 ? "." + String(minor % 100).padStart(2, "0") : ""}`;

/** Dates and times are shown in Mauritius time whatever the browser's time zone. */
export const TIME_ZONE = "Indian/Mauritius";

/** "12 Mar 2025", or "12 Mar, 14:05" with `withTime`; "—" when empty. */
export function formatDate(value: string | number | Date | null | undefined, withTime = false): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(getDateLocale(), {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : { year: "numeric" }),
  }).format(new Date(value));
}

/** "14:05:09" in Mauritius time. */
export const formatTime = (value: string | number | Date): string =>
  new Intl.DateTimeFormat(getDateLocale(), {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));

/** "Wednesday 12 March" for a calendar day "YYYY-MM-DD" (read as UTC so the day never shifts). */
export const formatDayLong = (day: string): string =>
  new Intl.DateTimeFormat(getDateLocale(), {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${day}T00:00:00Z`));
