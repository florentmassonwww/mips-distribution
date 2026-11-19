// Interface language. English is the default; French is kept only when explicitly chosen.
// The choice is read once at startup: switching language reloads the page.

export type Language = "en" | "fr";

/** localStorage key holding the chosen language ("fr" or "en"). Kept by the demo reset. */
export const LANGUAGE_STORAGE_KEY = "md_lang";

function readStoredLanguage(): Language {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) === "fr" ? "fr" : "en";
  } catch {
    // Storage unavailable (private mode, blocked cookies): fall back to English.
    return "en";
  }
}

/** Language of this page load. */
export const currentLanguage: Language = readStoredLanguage();

// Screen readers and hyphenation follow the document language.
document.documentElement.lang = currentLanguage;

export const getLanguage = (): Language => currentLanguage;

/** Locale used by Intl date formatting. */
export const getDateLocale = (): string => (currentLanguage === "en" ? "en-GB" : "fr-FR");

/** Stores the new language and reloads; does nothing if the choice cannot be stored. */
export function switchLanguage(language: Language): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    return;
  }
  location.reload();
}
