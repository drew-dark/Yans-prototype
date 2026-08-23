import i18next, { type i18n as I18nInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en.json";
import ja from "@/locales/ja.json";

export const SUPPORTED_LANGUAGES = ["en", "ja"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = "en";

export function isLanguage(v: unknown): v is Language {
  return typeof v === "string" && (SUPPORTED_LANGUAGES as readonly string[]).includes(v);
}

const resources = {
  en: { translation: en },
  ja: { translation: ja },
} as const;

let instance: I18nInstance | null = null;

/**
 * A single shared i18next instance for the whole app. Both dictionaries are
 * bundled up front (they're tiny) so there's no async load step and no
 * flash of untranslated content while a namespace fetches.
 */
export function getI18n(): I18nInstance {
  if (instance) return instance;
  instance = i18next.createInstance();
  instance.use(initReactI18next).init({
    resources,
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  return instance;
}
