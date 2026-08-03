import { createContext, useContext, useEffect, useMemo, useState } from "react";

export const THEMES = [
  { id: "kraft", label: "Ink & Kraft", swatch: "#c5a880", blurb: "Warm paper accent on deep ink." },
  { id: "ember", label: "Ember", swatch: "#e0703c", blurb: "Burnt orange, late-night radio." },
  { id: "newsprint", label: "Newsprint", swatch: "#cfd6dd", blurb: "Cool grey, broadsheet clarity." },
  { id: "moss", label: "Moss", swatch: "#69c39a", blurb: "Quiet green, garden hours." },
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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("kraft");

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
    if (stored && THEMES.some((t) => t.id === stored)) setThemeState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.dataset["theme"] = theme;
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
