import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

export const THEMES = [
  { id: "kraft", label: "Ink & Kraft", swatch: "#c5a880", blurb: "Warm paper accent on deep ink." },
  { id: "ember", label: "Ember", swatch: "#e0703c", blurb: "Burnt orange, late-night radio." },
  { id: "newsprint", label: "Newsprint", swatch: "#cfd6dd", blurb: "Cool grey, broadsheet clarity." },
  { id: "moss", label: "Moss", swatch: "#69c39a", blurb: "Quiet green, garden hours." },
  { id: "indigo", label: "Indigo", swatch: "#5b7fdb", blurb: "Deep blue, dye vats and night trains." },
  { id: "plum", label: "Plum", swatch: "#c77dab", blurb: "Dusty rose, early bloom before frost." },
  { id: "marigold", label: "Marigold", swatch: "#d4a72c", blurb: "Golden warmth, market stalls at dusk." },
  { id: "sakura", label: "Sakura", swatch: "#f2a6c1", blurb: "Cherry blossom pink — frosted glass surfaces." },
  { id: "ai", label: "Ai", swatch: "#7c98d6", blurb: "Ai-zome indigo — frosted glass surfaces." },
  { id: "matcha", label: "Matcha", swatch: "#9cbf6f", blurb: "Tea green — soft inflated clay surfaces." },
  { id: "sumi", label: "Sumi", swatch: "#b7abae", blurb: "Sumi ink charcoal — soft inflated clay surfaces." },
] as const;

/** The curated set an admin can project as the site-wide default: the
 * original base theme plus one glass and one clay option. */
export const ADMIN_DEFAULT_THEME_IDS = ["kraft", "sakura", "matcha"] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const THEME_STORAGE_KEY = "yans-theme";

/** Inline snippet run before hydration so the chosen theme never flashes. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var ok=${JSON.stringify(THEMES.map((t) => t.id))};if(t&&ok.indexOf(t)>-1){document.documentElement.dataset.theme=t;}}catch(e){}})();`;

type PersonalizeState = "checking" | "enabled" | "disabled";
type Ctx = { theme: ThemeId; setTheme: (t: ThemeId) => void; personalize: PersonalizeState };
const ThemeCtx = createContext<Ctx>({ theme: "kraft", setTheme: () => {}, personalize: "checking" });

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
  const [personalize, setPersonalize] = useState<PersonalizeState>("checking");

  // Adopt whatever was cached locally first, so there's no flash while
  // we go check the server for the authoritative value.
  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(stored)) setThemeState(stored);
  }, []);

  // Resolve the authoritative theme: a signed-in user's own saved
  // choice (profiles.theme) takes priority; everyone else — including
  // a signed-in user who hasn't picked one yet — gets the site-wide
  // default an admin has set (site_settings.default_theme).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;

        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("theme")
            .eq("user_id", user.id)
            .maybeSingle();
          if (cancelled) return;
          setPersonalize("enabled");
          if (profile?.theme && isTheme(profile.theme)) {
            applyTheme(profile.theme);
            return;
          }
        } else {
          setPersonalize("disabled");
        }

        const { data: settings } = await supabase
          .from("site_settings")
          .select("default_theme")
          .eq("id", "default")
          .maybeSingle();
        if (cancelled) return;
        if (settings?.default_theme && isTheme(settings.default_theme)) {
          applyTheme(settings.default_theme);
        }
      } catch {
        // Network hiccup or similar — fail safe to "disabled" rather than
        // leaving personalize stuck on "checking" forever, which would
        // permanently show a loading state instead of ever settling.
        if (!cancelled) setPersonalize("disabled");
      }
    })();
    return () => {
      cancelled = true;
    };

    function applyTheme(t: ThemeId) {
      setThemeState(t);
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, t);
      } catch {
        /* storage unavailable */
      }
    }
  }, []);

  // Keep other tabs / windows in sync, both ways.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY) return;
      if (isTheme(e.newValue)) setThemeState(e.newValue);
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
  }, []);

  useEffect(() => {
    document.documentElement.dataset["theme"] = theme;
  }, [theme]);

  const value = useMemo<Ctx>(
    () => ({
      theme,
      personalize,
      setTheme: (t) => {
        // Personalizing your own theme requires an account — this
        // mirrors bookmarks/comments/reactions, which are also
        // account-gated. Anonymous visitors see the site-wide default
        // an admin has chosen; ThemePicker hides the controls for them
        // rather than relying on this being silently ignored.
        if (personalize !== "enabled") return;
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
        (async () => {
          const { data } = await supabase.auth.getUser();
          if (!data.user) return;
          await supabase.from("profiles").upsert({ user_id: data.user.id, theme: t });
        })();
      },
    }),
    [theme, personalize],
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}


/** Compact swatch row for switching the site accent/theme. */
export function ThemeSwitcher({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  return (
    <div
      role="radiogroup"
      aria-label={t("theme.ariaLabel")}
      className={`flex items-center gap-1.5 ${className}`}
    >
      {THEMES.map((th) => (
        <button
          key={th.id}
          type="button"
          role="radio"
          aria-checked={theme === th.id}
          aria-label={t(`theme.${th.id}.label`)}
          title={t(`theme.${th.id}.label`)}
          onClick={() => setTheme(th.id)}
          className={`h-5 w-5 rounded-full border transition-transform hover:scale-110 motion-reduce:hover:scale-100 md:h-3.5 md:w-3.5 ${
            theme === th.id ? "border-white ring-1 ring-white/60" : "border-white/25"
          }`}
          style={{ backgroundColor: th.swatch }}
        />
      ))}
    </div>
  );
}

/** Full-size labelled theme cards, used on the Settings page. Requires
 * an account to interact with — anonymous visitors see the current
 * (site-wide default) theme called out, read-only, with a sign-in
 * prompt instead of the picker. */
export function ThemePicker({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const { theme, setTheme, personalize } = useTheme();

  if (personalize === "checking") {
    // Don't assert "sign in" while we still don't actually know — that
    // briefly told signed-in users they weren't, and clicking the link
    // it showed sent them to /auth despite already being authenticated.
    return (
      <div className={`surface-card flex items-center gap-3 p-4 ${className}`}>
        <span
          aria-hidden="true"
          className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-white/10"
        />
        <span className="h-3 w-32 animate-pulse rounded bg-white/10" aria-hidden="true" />
        <span className="sr-only">{t("theme.checking")}</span>
      </div>
    );
  }

  if (personalize === "disabled") {
    const current = THEMES.find((th) => th.id === theme);
    return (
      <div className={`surface-card flex items-center gap-3 p-4 ${className}`}>
        {current && (
          <span
            aria-hidden="true"
            className="h-9 w-9 shrink-0 rounded-full border border-white/25"
            style={{ backgroundColor: current.swatch }}
          />
        )}
        <span className="min-w-0">
          <span className="block font-mono text-xs uppercase tracking-widest text-white">
            {current ? t(`theme.${current.id}.label`) : t("theme.siteDefault")}
          </span>
          <span className="mt-1 block text-xs text-white/50">
            <Link to="/auth" className="underline hover:text-white">
              {t("nav.signIn")}
            </Link>{" "}
            {t("theme.signInToPersonalize")}
          </span>
        </span>
      </div>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label={t("theme.ariaLabel")}
      className={`grid gap-3 sm:grid-cols-2 ${className}`}
    >
      {THEMES.map((th) => {
        const active = theme === th.id;
        return (
          <button
            key={th.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(th.id)}
            className={`surface-card flex items-center gap-3 p-4 text-left ${
              active ? "border-kraft" : ""
            }`}
          >
            <span
              aria-hidden="true"
              className="h-9 w-9 shrink-0 rounded-full border border-white/25"
              style={{ backgroundColor: th.swatch }}
            />
            <span className="min-w-0">
              <span className="block font-mono text-xs uppercase tracking-widest text-white">
                {t(`theme.${th.id}.label`)}
              </span>
              <span className="mt-1 block text-xs text-white/50">
                {t(`theme.${th.id}.blurb`)}
              </span>
            </span>
            {active && (
              <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-widest text-kraft">
                {t("theme.active")}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
