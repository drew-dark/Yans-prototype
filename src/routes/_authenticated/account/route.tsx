import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "Your Account — The Last Mukwasu" }] }),
  component: AccountLayout,
});

const tabs = [
  { to: "/account", labelKey: "settings.profile" },
  { to: "/account/bookmarks", labelKey: "settings.bookmarks" },
  { to: "/account/comments", labelKey: "settings.comments" },
  { to: "/settings", labelKey: "settings.title" },
] as const;

function AccountLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen bg-[color:var(--site-bg)] text-white">
      <header className="border-b border-white/10 bg-white/[0.03] backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-display text-lg uppercase tracking-tight">
              Yans <span className="text-white/40">/ {t("settings.account")}</span>
            </Link>
            <nav className="hidden gap-1 md:flex">
              {tabs.map((tab) => {
                const active = pathname === tab.to;
                return (
                  <Link
                    key={tab.to}
                    to={tab.to}
                    className={`rounded px-3 py-1.5 text-xs uppercase tracking-widest ${
                      active ? "bg-kraft text-ink-dark" : "text-white/60 hover:text-white"
                    }`}
                  >
                    {t(tab.labelKey)}
                  </Link>
                );
              })}
            </nav>
          </div>
          <Button size="sm" variant="ghost" onClick={signOut}>
            {t("settings.signOut")}
          </Button>
        </div>
        <nav className="flex overflow-x-auto border-t border-white/10 px-4 py-2 md:hidden">
          {tabs.map((tab) => {
            const active = pathname === tab.to;
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={`whitespace-nowrap px-3 py-1 text-xs uppercase tracking-widest ${active ? "text-white" : "text-white/50"}`}
              >
                {t(tab.labelKey)}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
