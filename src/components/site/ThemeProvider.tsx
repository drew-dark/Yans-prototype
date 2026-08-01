import { createContext, useContext, useEffect, useMemo, useState } from "react";

export const THEMES = [
  { id: "kraft", label: "Ink & Kraft", swatch: "#c5a880" },
  { id: "ember", label: "Ember", swatch: "#e0703c" },
  { id: "newsprint", label: "Newsprint", swatch: "#cfd6dd" },
  { id: "moss", label: "Moss", swatch: "#69c39a" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

const STORAGE_KEY = "yans-theme";

type Ctx = { theme: ThemeId; setTheme: (t: ThemeId) => void };
const ThemeCtx = createContext<Ctx>({ theme: "kraft", setTheme: () => {} });

export function useTheme() {
  return useContext(ThemeCtx);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("kraft");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeId | null;
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
          window.localStorage.setItem(STORAGE_KEY, t);
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
          className={`h-3.5 w-3.5 rounded-full border transition-transform hover:scale-110 motion-reduce:hover:scale-100 ${
            theme === t.id ? "border-white ring-1 ring-white/60" : "border-white/25"
          }`}
          style={{ backgroundColor: t.swatch }}
        />
      ))}
    </div>
  );
}
