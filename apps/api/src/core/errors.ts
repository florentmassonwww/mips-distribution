// API errors: HTTP status, stable machine-readable code and a user-facing message.

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** 404 with a message naming the missing element, e.g. `notFound("Tournée")`. */
export const notFound = (what = "Élément"): ApiError => new ApiError(404, "not_found", `${what} introuvable.`);

/** 403 for a role that may not perform the action. */
export const forbidden = (): ApiError => new ApiError(403, "forbidden", "Accès non autorisé.");
