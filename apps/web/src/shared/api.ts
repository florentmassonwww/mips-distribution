import { translate } from "../i18n/translate.ts";
import { ApiError, localizeErrorMessage } from "./errors.ts";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Shape of an API error answer: { error: { code, message } }. */
interface ApiErrorBody {
  error?: { code?: string; message?: string };
}

/**
 * Calls the API on the same origin and returns the decoded JSON answer.
 * The X-Requested-With header is the API's CSRF guard: every call must send it.
 * Throws an ApiError with a message ready to display.
 */
export async function apiRequest<T = unknown>(method: HttpMethod, url: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      credentials: "same-origin",
      headers: {
        "X-Requested-With": "mips-distribution",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "network", translate("Connexion impossible. Vérifiez le réseau puis réessayez."));
  }
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (data as ApiErrorBody | null)?.error;
    const code = error?.code ?? "error";
    throw new ApiError(
      response.status,
      code,
      localizeErrorMessage(code, error?.message ?? translate("Une erreur est survenue. Réessayez.")),
    );
  }
  return data as T;
}
