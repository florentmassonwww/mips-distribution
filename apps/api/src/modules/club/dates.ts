// Calendar arithmetic on business days (YYYY-MM-DD), independent of the time zone.

const DAY_MS = 86_400_000;

/** Days since the Unix epoch of a YYYY-MM-DD day. */
const dayNumber = (day: string): number =>
  Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10))) / DAY_MS;

/** The day `days` days after `day`. */
export const addDaysToDay = (day: string, days: number): string =>
  new Date((dayNumber(day) + days) * DAY_MS).toISOString().slice(0, 10);

/** Number of days from `from` to `to` (negative when `to` is earlier). */
export const daysBetween = (from: string, to: string): number => dayNumber(to) - dayNumber(from);

/** Start of a Mauritius business day, as a Date. */
export const startOfBusinessDay = (day: string): Date => new Date(`${day}T00:00:00+04:00`);
