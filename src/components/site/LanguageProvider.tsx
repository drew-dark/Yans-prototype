import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { I18nextProvider } from "react-i18next";
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  getI18n,
  isLanguage,
  type Language,
} from "@/lib/i18n";

export const LANGUAGE_STORAGE_KEY = "yans-language";

/** Inline snippet run before hydration so the chosen language never flashes. */
export const languageInitScript = `(function(){try{var l=localStorage.getItem(${JSON.stringify(
  LANGUAGE_STORAGE_KEY,
)});var ok=${JSON.stringify(SUPPORTED_LANGUAGES)};if(l&&ok.indexOf(l)>-1){document.documentElement.lang=l;}}catch(e){}})();`;

type Ctx = { language: Language; setLanguage: (l: Language) => void };
const LanguageCtx = createContext<Ctx>({ language: DEFAULT_LANGUAGE, setLanguage: () => {} });

export function useLanguage() {
  return useContext(LanguageCtx);
}

/** Broadcast channel name used to keep every open tab on the same language. */
const LANGUAGE_CHANNEL = "yans-language-sync";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const i18n = useMemo(() => getI18n(), []);
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);

  // Adopt whatever was stored (survives login, logout, reloads and new tabs).
  useEffect(() => {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLanguage(stored) && stored !== DEFAULT_LANGUAGE) {
      setLanguageState(stored);
      void i18n.changeLanguage(stored);
    }
  }, [i18n]);

  // Keep other tabs / windows in sync, both ways.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LANGUAGE_STORAGE_KEY) return;
      if (isLanguage(e.newValue)) {
        setLanguageState(e.newValue);
        void i18n.changeLanguage(e.newValue);
      } else if (e.newValue === null) {
        // Another tab cleared storage (e.g. a sign-out) — restore our choice.
        try {
          window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
        } catch {
          /* storage unavailable */
        }
      }
    };
    window.addEventListener("storage", onStorage);

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(LANGUAGE_CHANNEL);
      channel.onmessage = (e) => {
        if (isLanguage(e.data)) {
          setLanguageState(e.data);
          void i18n.changeLanguage(e.data);
        }
      };
    }

    return () => {
      window.removeEventListener("storage", onStorage);
      channel?.close();
    };
  }, [language, i18n]);

  useEffect(() => {
    document.documentElement.lang = language;
    try {
      if (window.localStorage.getItem(LANGUAGE_STORAGE_KEY) !== language) {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      }
    } catch {
      /* storage unavailable */
    }
  }, [language]);

  const value = useMemo<Ctx>(
    () => ({
      language,
      setLanguage: (l) => {
        setLanguageState(l);
        void i18n.changeLanguage(l);
        try {
          window.localStorage.setItem(LANGUAGE_STORAGE_KEY, l);
        } catch {
          /* storage unavailable */
        }
        try {
          if (typeof BroadcastChannel !== "undefined") {
            const ch = new BroadcastChannel(LANGUAGE_CHANNEL);
            ch.postMessage(l);
            ch.close();
          }
        } catch {
          /* channel unavailable */
        }
      },
    }),
    [language, i18n],
  );

  return (
    <I18nextProvider i18n={i18n}>
      <LanguageCtx.Provider value={value}>{children}</LanguageCtx.Provider>
    </I18nextProvider>
  );
}

/** Compact EN / JA toggle, for the site header. */
export function LanguageToggle({ className = "" }: { className?: string }) {
  const { language, setLanguage } = useLanguage();
  return (
    <div
      role="radiogroup"
      aria-label="Language"
      className={`inline-flex items-center overflow-hidden rounded-full border border-white/20 font-mono text-[10px] uppercase tracking-widest ${className}`}
    >
      {SUPPORTED_LANGUAGES.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={language === l}
          onClick={() => setLanguage(l)}
          className={`px-2 py-1 transition-colors ${
            language === l ? "bg-white/15 text-white" : "text-white/50 hover:text-white"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
