import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_DEFAULT_THEME_IDS, THEMES, type ThemeId } from "@/components/site/ThemeProvider";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/theme")({
  component: ThemeAdmin,
});

function ThemeAdmin() {
  const qc = useQueryClient();
  const { data: current, isLoading } = useQuery({
    queryKey: ["admin", "site-settings", "default-theme"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("default_theme")
        .eq("id", "default")
        .single();
      if (error) throw error;
      return data.default_theme as ThemeId;
    },
  });

  const save = useMutation({
    mutationFn: async (theme: ThemeId) => {
      const { error } = await supabase
        .from("site_settings")
        .update({ default_theme: theme })
        .eq("id", "default");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "site-settings", "default-theme"] });
      toast.success("Site default theme updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const options = THEMES.filter((t) => (ADMIN_DEFAULT_THEME_IDS as readonly string[]).includes(t.id));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase">Site theme</h1>
        <p className="mt-1 text-sm text-white/50">
          Sets the default theme every visitor sees — anonymous visitors, and any signed-in
          reader who hasn't picked a theme of their own in their Settings page. It never
          overrides a reader's personal choice once they've made one.
        </p>
      </div>

      {isLoading ? (
        <p className="text-white/40">Loading…</p>
      ) : (
        <div role="radiogroup" aria-label="Site default theme" className="grid gap-3 sm:grid-cols-3">
          {options.map((t) => {
            const active = current === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={save.isPending}
                onClick={() => save.mutate(t.id)}
                className={`flex flex-col items-start gap-2 rounded border p-4 text-left transition-colors ${
                  active
                    ? "border-kraft bg-white/[0.06]"
                    : "border-white/12 hover:border-white/35 hover:bg-white/[0.03]"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="h-8 w-8 rounded-full border border-white/25"
                  style={{ backgroundColor: t.swatch }}
                />
                <span className="font-mono text-xs uppercase tracking-widest text-white">
                  {t.label}
                </span>
                <span className="text-xs text-white/50">{t.blurb}</span>
                {active && (
                  <span className="font-mono text-[10px] uppercase tracking-widest text-kraft">
                    Current default
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
