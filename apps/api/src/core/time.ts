// Dates. Business days are computed in Mauritius time; timestamps are stored as ISO 8601 UTC.

export const TIME_ZONE = "Indian/Mauritius";

const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

/** ISO 8601 UTC timestamp, as stored in the database. */
export const iso = (d: Date): string => d.toISOString();

/** Business day (YYYY-MM-DD) of an instant, in Mauritius time. */
export const businessDay = (d: Date): string => dayFormat.format(d);

/** Same instant shifted by a number of days (may be negative). */
export const addDays = (d: Date, days: number): Date => new Date(d.getTime() + days * 86_400_000);
