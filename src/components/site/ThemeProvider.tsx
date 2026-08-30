import { createContext, useContext, useEffect, useMemo, useState } from "react";

export const THEMES = [
  { id: "kraft", label: "Ink & Kraft", swatch: "#c5a880", blurb: "Warm paper accent on deep ink." },
  { id: "ember", label: "Ember", swatch: "#e0703c", blurb: "Burnt orange, late-night radio." },
  { id: "newsprint", label: "Newsprint", swatch: "#cfd6dd", blurb: "Cool grey, broadsheet clarity." },
  { id: "moss", label: "Moss", swatch: "#69c39a", blurb: "Quiet green, garden hours." },
  { id: "sakura", label: "Sakura", swatch: "#f2a6c1", blurb: "Cherry blossom pink — frosted glass surfaces." },
  { id: "ai", label: "Ai", swatch: "#7c98d6", blurb: "Ai-zome indigo — frosted glass surfaces." },
  { id: "matcha", label: "Matcha", swatch: "#9cbf6f", blurb: "Tea green — soft inflated clay surfaces." },
  { id: "sumi", label: "Sumi", swatch: "#b7abae", blurb: "Sumi ink charcoal — soft inflated clay surfaces." },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const THEME_STORAGE_KEY = "yans-theme";

/** Inline snippet run before hydration so the chosen theme never flashes. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var ok=${JSON.stringify(THEMES.map((t) => t.id))};if(t&&ok.indexOf(t)>-1){document.documentElement.dataset.theme=t;}}catch(e){}})();`;

type Ctx = { theme: ThemeId; setTheme: (t: ThemeId) => void };
const ThemeCtx = createContext<Ctx>({ theme: "kraft", setTheme: () => {} });

export function useTheme() {
  return useContext(ThemeCtx);
}

function isTheme(v: unknown): v is ThemeId {
  return typeof v === "string" && THEMES.some((t) => t.id === v);
}

/** Broadcast channel name used to keep every open tab on the same theme. */
const THEME_CHANNEL = "yans-theme-sync";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("kraft");

  // Adopt whatever was stored (survives login, logout, reloads and new tabs).
  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(stored)) setThemeState(stored);
  }, []);

  // Keep other tabs / windows in sync, both ways.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY) return;
      if (isTheme(e.newValue)) setThemeState(e.newValue);
      else if (e.newValue === null) {
        // Another tab cleared storage (e.g. a sign-out) — restore our choice.
        try {
          window.localStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch {
          /* storage unavailable */
        }
      }
    };
    window.addEventListener("storage", onStorage);

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(THEME_CHANNEL);
      channel.onmessage = (e) => {
        if (isTheme(e.data)) setThemeState(e.data);
      };
    }

    return () => {
      window.removeEventListener("storage", onStorage);
      channel?.close();
    };
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset["theme"] = theme;
    // Re-assert storage in case an auth flow wiped it.
    try {
      if (window.localStorage.getItem(THEME_STORAGE_KEY) !== theme) {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      }
    } catch {
      /* storage unavailable */
    }
  }, [theme]);

  const value = useMemo<Ctx>(
    () => ({
      theme,
      setTheme: (t) => {
        setThemeState(t);
        try {
          window.localStorage.setItem(THEME_STORAGE_KEY, t);
        } catch {
          /* storage unavailable */
        }
        try {
          if (typeof BroadcastChannel !== "undefined") {
            const ch = new BroadcastChannel(THEME_CHANNEL);
            ch.postMessage(t);
            ch.close();
          }
        } catch {
          /* channel unavailable */
        }
      },
    }),
    [theme],
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}


/** Compact swatch row for switching the site accent/theme. */
export function ThemeSwitcher({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={`flex items-center gap-1.5 ${className}`}
    >
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={theme === t.id}
          aria-label={t.label}
          title={t.label}
          onClick={() => setTheme(t.id)}
          className={`h-5 w-5 rounded-full border transition-transform hover:scale-110 motion-reduce:hover:scale-100 md:h-3.5 md:w-3.5 ${
            theme === t.id ? "border-white ring-1 ring-white/60" : "border-white/25"
          }`}
          style={{ backgroundColor: t.swatch }}
        />
      ))}
    </div>
  );
}

/** Full-size labelled theme cards, used on the Settings page. */
export function ThemePicker({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={`grid gap-3 sm:grid-cols-2 ${className}`}
    >
      {THEMES.map((t) => {
        const active = theme === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(t.id)}
            className={`flex items-center gap-3 rounded border p-4 text-left transition-colors ${
              active
                ? "border-kraft bg-white/[0.06]"
                : "border-white/12 hover:border-white/35 hover:bg-white/[0.03]"
            }`}
          >
            <span
              aria-hidden="true"
              className="h-9 w-9 shrink-0 rounded-full border border-white/25"
              style={{ backgroundColor: t.swatch }}
            />
            <span className="min-w-0">
              <span className="block font-mono text-xs uppercase tracking-widest text-white">
                {t.label}
              </span>
              <span className="mt-1 block text-xs text-white/50">{t.blurb}</span>
            </span>
            {active && (
              <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-widest text-kraft">
                Active
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
