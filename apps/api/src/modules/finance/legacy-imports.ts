// Typed bindings to functions of modules not rewritten yet (removed once they are).
import * as m_distribution_days from "../distribution/days.ts";
// Bound at call time: the legacy modules form import cycles with this one.

export { companySettings, openException, resolveExceptions } from "../payments/legacy-imports.ts";

/** True for a valid YYYY-MM-DD business day. */
export function isValidDay(day: string): boolean {
  return m_distribution_days.isValidDay(day);
}

/** [start, end) of a business day (Mauritius time), as ISO UTC timestamps. */
export function dayBounds(day: string): [string, string] {
  return m_distribution_days.dayBounds(day);
}
