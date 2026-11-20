// API errors: HTTP status, stable machine-readable code and a user-facing message.
import { RuleError } from "@mips/core";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** HTTP status of a business rule refusal (@mips/core): invalid request 400, state conflict 409. */
const RULE_STATUS = { invalid: 400, conflict: 409 } as const;

/** Any error the API answers with its own status and code, business rule refusals included. */
export function asApiError(error: unknown): ApiError | null {
  if (error instanceof ApiError) return error;
  if (error instanceof RuleError) return new ApiError(RULE_STATUS[error.kind], error.code, error.message);
  return null;
}

/** 404 with a message naming the missing element, e.g. `notFound("Tournée")`. */
export const notFound = (what = "Élément"): ApiError => new ApiError(404, "not_found", `${what} introuvable.`);

/** 403 for a role that may not perform the action. */
export const forbidden = (): ApiError => new ApiError(403, "forbidden", "Accès non autorisé.");
