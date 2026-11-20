// A business rule refused an operation. The rules know nothing of HTTP: `kind` says whether the
// request itself is invalid or conflicts with the current state, and the API maps it to a status.

export type RuleErrorKind = "invalid" | "conflict";

export class RuleError extends Error {
  readonly kind: RuleErrorKind;
  /** Stable, machine-readable code, returned by the API as is. */
  readonly code: string;
  constructor(kind: RuleErrorKind, code: string, message: string) {
    super(message);
    this.name = "RuleError";
    this.kind = kind;
    this.code = code;
  }
}

export const invalid = (code: string, message: string): RuleError => new RuleError("invalid", code, message);
export const conflict = (code: string, message: string): RuleError => new RuleError("conflict", code, message);
