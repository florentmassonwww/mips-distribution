import { currentLanguage } from "./language.ts";
import { translations } from "./translations.ts";

export type TranslationArg = string | number;

/**
 * Translates a French text for the current language and fills its "{0}", "{1}"… placeholders.
 * Texts missing from the table are shown as written (in French).
 */
export function translate(french: string, ...args: TranslationArg[]): string {
  const text = (currentLanguage === "en" ? translations[french] : undefined) ?? french;
  if (!args.length) return text;
  return text.replace(/\{(\d+)\}/g, (_placeholder, index: string) => String(args[Number(index)] ?? ""));
}
