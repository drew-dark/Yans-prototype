import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/site/SiteChrome";
import { ThemePicker } from "@/components/site/ThemeProvider";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Colours & Reading | The Last Mukwasu" },
      {
        name: "description",
        content:
          "Choose your colour theme and reading preferences for The Last Mukwasu archive of poetry, stories and diaries.",
      },
      { property: "og:title", content: "Settings — The Last Mukwasu" },
      {
        property: "og:description",
        content: "Pick a colour theme and reading preferences for The Last Mukwasu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState<string | null>(null);
  const [staff, setStaff] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      setEmail(user?.email ?? null);
      if (!user) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const list = (roles ?? []).map((r: { role: string }) => r.role);
      setStaff(list.some((r) => ["admin", "editor", "moderator", "guest_author"].includes(r)));
    })();
  }, []);

  return (
    <PageShell>
      <main className="mx-auto max-w-3xl px-5 py-10 md:px-12 md:py-16">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-kraft">{t("settings.preferences")}</p>
        <h1 className="mt-2 font-display text-4xl uppercase tracking-tight md:text-6xl">{t("settings.title")}</h1>
        <div className="mt-4 h-px w-24 rule-kraft" />

        <section className="mt-10" aria-labelledby="appearance">
          <h2 id="appearance" className="font-display text-2xl uppercase tracking-tight">
            {t("settings.appearance")}
          </h2>
          <p className="mt-1 text-sm text-white/50">
            {t("settings.appearanceDesc")}
          </p>
          <ThemePicker className="mt-5" />
        </section>

        <section className="mt-12" aria-labelledby="account">
          <h2 id="account" className="font-display text-2xl uppercase tracking-tight">
            {t("settings.account")}
          </h2>
          {email ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-white/60">
                {t("settings.signedInAs")} <span className="font-mono text-white/80">{email}</span>
              </p>
              <div className="flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-widest">
                <Link
                  to="/account"
                  className="border border-white/20 px-3 py-2 text-white/70 hover:border-white hover:text-white"
                >
                  {t("settings.profile")}
                </Link>
                <Link
                  to="/account/bookmarks"
                  className="border border-white/20 px-3 py-2 text-white/70 hover:border-white hover:text-white"
                >
                  {t("settings.bookmarks")}
                </Link>
                <Link
                  to="/account/comments"
                  className="border border-white/20 px-3 py-2 text-white/70 hover:border-white hover:text-white"
                >
                  {t("settings.comments")}
                </Link>
                {staff && (
                  <Link
                    to="/admin"
                    className="border border-kraft px-3 py-2 text-kraft hover:bg-kraft hover:text-ink-dark"
                  >
                    ◆ {t("settings.studio")}
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-white/50">
              <Link to="/auth" className="underline hover:text-white">
                {t("settings.signIn")}
              </Link>{" "}
              {t("settings.signInPrompt")}
            </p>
          )}
        </section>

        <section className="mt-12" aria-labelledby="motion">
          <h2 id="motion" className="font-display text-2xl uppercase tracking-tight">
            {t("settings.motion")}
          </h2>
          <p className="mt-1 text-sm text-white/50">
            {t("settings.motionDesc")}
          </p>
        </section>
      </main>
    </PageShell>
  );
}
