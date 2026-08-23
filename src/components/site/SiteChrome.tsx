import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { LanguageToggle } from "@/components/site/LanguageProvider";
import { Settings } from "lucide-react";


const links = [
  { to: "/collection", labelKey: "nav.collection" },
  { to: "/gallery", labelKey: "nav.gallery" },
  { to: "/diaries", labelKey: "nav.diaries" },
  { to: "/stories", labelKey: "nav.stories" },
  { to: "/show", labelKey: "nav.show" },
  { to: "/shop", labelKey: "nav.shop" },
  { to: "/about", labelKey: "nav.about" },
] as const;

function useSessionEmail() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setEmail(data.session?.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (mounted) setEmail(session?.user?.email ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return email;
}

function AuthAffordance() {
  const { t } = useTranslation();
  const email = useSessionEmail();
  if (!email) {
    return (
      <Link
        to="/auth"
        className="border border-white/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-white/60 hover:border-white hover:text-white"
      >
        {t("nav.signIn")}
      </Link>
    );
  }
  return (
    <Link
      to="/account"
      className="border border-white/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-white/70 hover:border-white hover:text-white"
      title={email}
    >
      ◇ {t("nav.account")}
    </Link>
  );
}

export function SiteHeader() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-white/5 px-4 py-3 md:flex md:items-start md:justify-between md:px-12 md:py-6">
      <Link to="/" className="block min-w-0">
        <div
          className="-rotate-1 transform bg-kraft px-3 py-1.5 shadow-xl md:px-4 md:py-2"
          style={{
            clipPath:
              "polygon(0% 5%, 5% 0%, 95% 2%, 100% 8%, 98% 92%, 100% 100%, 5% 98%, 0% 90%)",
          }}
        >
          <div className="flex min-w-0 items-center gap-2 md:gap-2.5">
            <img
              src="/favicon.png"
              alt="ER monogram"
              width={28}
              height={28}
              className="h-6 w-6 shrink-0 object-contain mix-blend-multiply md:h-7 md:w-7"
            />
            <div className="min-w-0">
              <h1 className="truncate font-mono text-[11px] font-bold leading-none tracking-tight text-ink-dark md:text-sm">
                THE LAST MUKWASU
              </h1>
              <p className="mt-1 font-mono text-[8px] uppercase tracking-widest text-ink-dark/80 md:text-[9px]">
                Yans Lounge
              </p>
            </div>
          </div>
        </div>
      </Link>
      <div className="flex shrink-0 items-center gap-3 md:gap-6 md:pt-2">
        <nav className="hidden items-center gap-6 text-[11px] font-bold uppercase tracking-[0.3em] text-white/60 md:flex">
          {links.map((l) => {
            const active = pathname === l.to || pathname.startsWith(l.to + "/");
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`transition-colors hover:text-white ${active ? "text-white" : ""}`}
              >
                {t(l.labelKey)}
              </Link>
            );
          })}
        </nav>
        <LanguageToggle className="hidden md:inline-flex" />
        <Link
          to="/settings"
          aria-label={t("nav.settingsLabel")}
          title={t("nav.settingsTitle")}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/60 transition-colors hover:border-white hover:text-white md:h-7 md:w-7"
        >
          <Settings className="h-4 w-4 md:h-3.5 md:w-3.5" aria-hidden="true" />
        </Link>

        <AuthAffordance />
      </div>
    </header>
  );
}

export function MobileNav() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  return (
    <nav
      aria-label={t("nav.sectionsAriaLabel")}
      className="relative flex items-center gap-1 overflow-x-auto border-b border-white/10 px-3 py-1.5 [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
    >
      {links.map((l) => {
        const active = pathname === l.to || pathname.startsWith(l.to + "/");
        return (
          <Link
            key={l.to}
            to={l.to}
            className={`whitespace-nowrap px-3 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors ${
              active
                ? "border-b-2 border-kraft text-white"
                : "border-b-2 border-transparent text-white/45"
            }`}
          >
            {t(l.labelKey)}
          </Link>
        );
      })}
      <LanguageToggle className="ml-2 shrink-0" />
    </nav>
  );
}

export function SiteNavBar() {
  return (
    <div className="sticky top-0 z-40 bg-[color:var(--site-bg)]/90 backdrop-blur-md">
      <SiteHeader />
      <MobileNav />
    </div>
  );
}


export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="mt-16 border-t border-white/10 px-5 py-10 md:mt-24 md:px-12 md:py-12">
      <div className="mx-auto mb-8 h-px max-w-6xl rule-kraft opacity-60" />
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 text-xs md:flex-row md:items-end">
        <div>
          <span className="mb-1 block font-mono text-[9px] uppercase tracking-widest text-white/30">
            {t("footer.copyright")}
          </span>
          <Link to="/" className="text-white/60 hover:text-white">
            the last mukwasu
          </Link>
        </div>
        <div className="grid w-full grid-cols-3 gap-x-4 gap-y-3 text-[10px] uppercase tracking-widest text-white/40 sm:w-auto sm:flex sm:gap-4">
          <Link to="/stories" className="py-1 hover:text-white">{t("nav.stories")}</Link>
          <Link to="/diaries" className="py-1 hover:text-white">{t("nav.diaries")}</Link>
          <Link to="/collection/dear-today" className="py-1 hover:text-white">{t("footer.dearToday")}</Link>
          <Link to="/gallery" className="py-1 hover:text-white">{t("nav.gallery")}</Link>
          <Link to="/show" className="py-1 hover:text-white">{t("nav.show")}</Link>
          <Link to="/shop" className="py-1 hover:text-white">{t("nav.shop")}</Link>
          <Link to="/about" className="py-1 hover:text-white">{t("nav.about")}</Link>
          <Link to="/settings" className="py-1 hover:text-white">{t("nav.settingsLabel")}</Link>

        </div>
      </div>
    </footer>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen w-full font-sans text-white"
      style={{
        backgroundColor: "var(--site-bg)",
        backgroundImage:
          "radial-gradient(circle at 20% 30%, var(--site-glow-a) 0%, transparent 50%), radial-gradient(circle at 80% 70%, var(--site-glow-b) 0%, transparent 55%)",
      }}
    >
      <SiteNavBar />
      {children}
      <SiteFooter />
    </div>
  );
}

