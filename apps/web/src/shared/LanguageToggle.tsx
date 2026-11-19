import { getLanguage, switchLanguage } from "../i18n/language.ts";

/**
 * Button switching between English and French; it shows the language it switches to.
 * Disabled offline because switching reloads the page. `light` is for light backgrounds.
 */
export function LanguageToggle({ light }: { light?: boolean }) {
  const other = getLanguage() === "fr" ? "en" : "fr";
  return (
    <button
      type="button"
      className={`sm noprint ${light ? "secondary" : "ghost"}`}
      disabled={!navigator.onLine}
      onClick={() => switchLanguage(other)}
      aria-label={other === "en" ? "Switch to English" : "Passer en français"}
    >
      {other.toUpperCase()}
    </button>
  );
}
