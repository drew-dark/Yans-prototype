import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type UiMode = "classic" | "immersive";

type ImmersiveModeContextValue = {
  mode: UiMode;
  setMode: (mode: UiMode) => Promise<void>;
  loaded: boolean;
};

const ImmersiveModeContext = createContext<ImmersiveModeContextValue>({
  mode: "classic",
  setMode: async () => {},
  loaded: false,
});

export function useImmersiveMode() {
  return useContext(ImmersiveModeContext);
}

export const UI_MODE_STORAGE_KEY = "yans-ui-mode";

/** Inline snippet for __root.tsx, alongside themeInitScript — sets the
 * data-ui-mode attribute before hydration. Doesn't by itself fix the
 * bento-vs-list flash (that's a React render branch, not CSS — see the
 * layout effect below), but keeps this in parity with the theme system
 * for any [data-ui-mode] CSS added later. */
export const uiModeInitScript = `(function(){try{var m=localStorage.getItem(${JSON.stringify(
  UI_MODE_STORAGE_KEY,
)});if(m==="immersive"||m==="classic"){document.documentElement.dataset.uiMode=m;}}catch(e){}})();`;

// SSR-safe: useLayoutEffect warns on the server, so fall back to
// useEffect there. On the client this genuinely needs to be a layout
// effect — it runs before the browser paints, which is what prevents a
// returning immersive-mode user from seeing a frame of the classic
// list/strip layout before it snaps into the bento grid.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function ImmersiveModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<UiMode>("classic");
  const [userId, setUserId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Adopt whatever was cached locally first — before paint — so there's
  // no flash while the authoritative value is fetched below. Same
  // cache-then-verify shape as ThemeProvider, but as a layout effect
  // rather than a regular one, because this state drives an actual JSX
  // branch (bento grid vs. list) rather than only CSS variables.
  useIsomorphicLayoutEffect(() => {
    try {
      const stored = window.localStorage.getItem(UI_MODE_STORAGE_KEY);
      if (stored === "immersive") setModeState("immersive");
    } catch {
      // localStorage unavailable (private browsing, etc.) — fine, falls
      // through to the authoritative fetch below same as a fresh visit.
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user?.id ?? null;
      if (!mounted) return;
      setUserId(uid);
      if (!uid) {
        setLoaded(true);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("ui_mode")
        .eq("user_id", uid)
        .maybeSingle();
      if (!mounted) return;
      const resolved: UiMode = profile?.ui_mode === "immersive" ? "immersive" : "classic";
      setModeState(resolved);
      try {
        window.localStorage.setItem(UI_MODE_STORAGE_KEY, resolved);
      } catch {
        // best-effort cache; nothing to do if storage is unavailable
      }
      setLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-ui-mode", mode);
  }, [mode]);

  async function setMode(next: UiMode) {
    setModeState(next);
    try {
      window.localStorage.setItem(UI_MODE_STORAGE_KEY, next);
    } catch {
      // best-effort cache
    }
    if (!userId) return; // guests get the session-only preview, not persisted
    await supabase.from("profiles").update({ ui_mode: next }).eq("user_id", userId);
  }

  return (
    <ImmersiveModeContext.Provider value={{ mode, setMode, loaded }}>{children}</ImmersiveModeContext.Provider>
  );
}
