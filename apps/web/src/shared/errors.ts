import { currentLanguage } from "../i18n/language.ts";
import { translations } from "../i18n/translations.ts";

/**
 * Message to show for an API error. The API answers in French; in English the message itself is
 * looked up first, then a generic text for its code ("err.<code>"), else the French is kept.
 */
export const localizeErrorMessage = (code: string, message: string): string =>
  currentLanguage === "en" ? (translations[message] ?? translations[`err.${code}`] ?? message) : message;

/** Error raised by apiRequest: HTTP status (0 when the network failed) and API error code. */
export class ApiError extends Error {
  code: string;
  status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
