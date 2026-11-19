// Business days (YYYY-MM-DD, Mauritius time, UTC+4 all year round).
import { iso } from "../../core/time.ts";

const startOfDay = (day: string): Date => new Date(`${day}T00:00:00+04:00`);

/** ISO bounds [start, end) of a business day, for range queries on stored timestamps. */
export function dayBounds(day: string): [string, string] {
  const start = startOfDay(day);
  return [iso(start), iso(new Date(start.getTime() + 86_400_000))];
}

/** True for a well-formed, existing calendar day. */
export const isValidDay = (day: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(startOfDay(day).getTime());
