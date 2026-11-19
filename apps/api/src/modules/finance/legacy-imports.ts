// Typed bindings to functions of modules not rewritten yet (removed once they are).
// Bound at call time: the legacy modules form import cycles with this one.
// @ts-expect-error -- legacy module without type declarations
import * as distribution from "../../legacy/distribution.mjs";

export { companySettings, openException, resolveExceptions } from "../payments/legacy-imports.ts";

/** True for a valid YYYY-MM-DD business day. */
export function isValidDay(day: string): boolean {
  return distribution.$u(day);
}

/** [start, end) of a business day (Mauritius time), as ISO UTC timestamps. */
export function dayBounds(day: string): [string, string] {
  return distribution.Qu(day);
}
