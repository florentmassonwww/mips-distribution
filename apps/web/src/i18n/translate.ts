import { currentLanguage } from "./language.ts";
import { translations } from "./translations.ts";

export type TranslationArg = string | number | null | undefined;

/**
 * Translates a French text for the current language and fills its "{0}", "{1}"… placeholders.
 * Texts missing from the table are shown as written (in French).
 */
export function translate(french: string, ...args: TranslationArg[]): string {
  const text = (currentLanguage === "en" ? translations[french] : undefined) ?? french;
  if (!args.length) return text;
  return text.replace(/\{(\d+)\}/g, (_placeholder, index: string) => String(args[Number(index)] ?? ""));
}

/**
 * Translates a counted text, choosing the singular or plural form for the current language:
 * French uses the singular for 0 and 1 (« 0 commande », « 2 commandes »), English only for exactly 1
 * ("0 orders", "1 order"). Both French forms are keys of the table. "{0}" is the count; the extra
 * arguments fill "{1}", "{2}"…
 */
export function translateCount(count: number, oneFr: string, otherFr: string, ...extraArgs: TranslationArg[]): string {
  const singular = currentLanguage === "en" ? count === 1 : Math.abs(count) < 2;
  return translate(singular ? oneFr : otherFr, count, ...extraArgs);
}
