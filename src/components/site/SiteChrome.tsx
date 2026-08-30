import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { LanguageToggle } from "@/components/site/LanguageProvider";
import { Settings, Menu, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export const navLinks = [
  { to: "/collection", labelKey: "nav.collection" },
  { to: "/gallery", labelKey: "nav.gallery" },
  { to: "/diaries", labelKey: "nav.diaries" },
  { to: "/stories", labelKey: "nav.stories" },
  { to: "/footprints", labelKey: "nav.footprints" },
  { to: "/show", labelKey: "nav.show" },
  { to: "/shop", labelKey: "nav.shop" },
  { to: "/about", labelKey: "nav.about" },
] as const;

/** "Dear Today" lives under Collection (/collection/dear-today) — shown as
 * a sub-item in the desktop dropdown and mobile drawer instead of taking
 * its own slot in the main nav. */
const collectionSubLinks = [{ to: "/collection/dear-today", labelKey: "nav.dearToday" }] as const;

const STAFF_ROLES = ["admin", "editor", "moderator", "guest_author"] as const;

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

/** Whether the signed-in user holds any staff role (admin/editor/moderator/guest_author). */
function useIsStaff() {
  const [userId, setUserId] = useState<string | null>(null);
  const [staff, setStaff] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setUserId(data.session?.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (mounted) setUserId(session?.user?.id ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setStaff(false);
      return;
    }
    let mounted = true;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (!mounted) return;
        const roles = (data ?? []).map((r: { role: string }) => r.role);
        setStaff(roles.some((r) => (STAFF_ROLES as readonly string[]).includes(r)));
      });
    return () => {
      mounted = false;
    };
  }, [userId]);

  return staff;
}

/**
 * Single sign-in entry point that reveals itself after login: signed-out
 * visitors see one "Sign in" link (shared by readers and staff alike —
 * the system distinguishes only after authenticating); signed-in readers
 * see "Account"; signed-in staff see both "Account" and "Studio".
 */
export function AuthAffordance({ className = "flex" }: { className?: string }) {
  const { t } = useTranslation();
  const email = useSessionEmail();
  const staff = useIsStaff();

  if (!email) {
    return (
      <Link
        to="/auth"
        className={`border border-white/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-white/60 hover:border-white hover:text-white ${className}`}
      >
        {t("nav.signIn")}
      </Link>
    );
  }
  return (
    <div className={`items-center gap-2 ${className}`}>
      <Link
        to="/account"
        className="border border-white/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-white/70 hover:border-white hover:text-white"
        title={email}
      >
        ◇ {t("nav.account")}
      </Link>
      {staff && (
        <Link
          to="/admin"
          className="border border-white/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-white/70 hover:border-white hover:text-white"
          title="Studio access for staff"
        >
          ◆ {t("nav.studio")}
        </Link>
      )}
    </div>
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
            clipPath: "polygon(0% 5%, 5% 0%, 95% 2%, 100% 8%, 98% 92%, 100% 100%, 5% 98%, 0% 90%)",
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
          {navLinks.map((l) => {
            if (l.to === "/collection") {
              const active = pathname.startsWith("/collection");
              return (
                <DropdownMenu key={l.to}>
                  <DropdownMenuTrigger
                    className={`flex items-center gap-1 outline-none transition-colors hover:text-white ${active ? "text-white" : ""}`}
                  >
                    {t(l.labelKey)}
                    <ChevronDown className="h-3 w-3" aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="border-white/10 bg-neutral-950 text-white/70"
                  >
                    <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-white">
                      <Link to="/collection" className="cursor-pointer text-xs uppercase tracking-widest">
                        {t(l.labelKey)}
                      </Link>
                    </DropdownMenuItem>
                    {collectionSubLinks.map((sub) => (
                      <DropdownMenuItem
                        key={sub.to}
                        asChild
                        className="focus:bg-white/10 focus:text-white"
                      >
                        <Link to={sub.to} className="cursor-pointer text-xs uppercase tracking-widest">
                          {t(sub.labelKey)}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }
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
          className="hidden h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/60 transition-colors hover:border-white hover:text-white md:inline-flex md:h-7 md:w-7"
        >
          <Settings className="h-4 w-4 md:h-3.5 md:w-3.5" aria-hidden="true" />
        </Link>

        <AuthAffordance className="hidden items-center gap-2 md:flex" />

        <MobileMenu />
      </div>
    </header>
  );
}

/** Hamburger-triggered slide-out drawer, replacing the old horizontal
 * scrolling pill strip on mobile — every section is visible at a glance
 * without scrolling, and Dear Today nests under Collection. */
function MobileMenu() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <Sheet>
      <SheetTrigger
        aria-label={t("nav.menuLabel")}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/60 transition-colors hover:border-white hover:text-white md:hidden"
      >
        <Menu className="h-4 w-4" aria-hidden="true" />
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-[85vw] max-w-sm flex-col border-white/10 bg-neutral-950 text-white sm:max-w-sm"
      >
        <SheetHeader>
          <SheetTitle className="font-display text-xl uppercase tracking-tight text-white">
            {t("nav.menuLabel")}
          </SheetTitle>
        </SheetHeader>

        <nav className="mt-4 flex flex-1 flex-col gap-1 overflow-y-auto">
          {navLinks.map((l) => {
            const active = pathname === l.to || pathname.startsWith(l.to + "/");
            return (
              <div key={l.to}>
                <SheetClose asChild>
                  <Link
                    to={l.to}
                    className={`block border-b border-white/5 py-3 font-mono text-xs uppercase tracking-widest ${
                      active ? "text-white" : "text-white/60"
                    }`}
                  >
                    {t(l.labelKey)}
                  </Link>
                </SheetClose>
                {l.to === "/collection" &&
                  collectionSubLinks.map((sub) => {
                    const subActive = pathname === sub.to;
                    return (
                      <SheetClose key={sub.to} asChild>
                        <Link
                          to={sub.to}
                          className={`block border-b border-white/5 py-2.5 pl-4 font-mono text-[11px] uppercase tracking-widest ${
                            subActive ? "text-white" : "text-white/40"
                          }`}
                        >
                          ↳ {t(sub.labelKey)}
                        </Link>
                      </SheetClose>
                    );
                  })}
              </div>
            );
          })}
        </nav>

        <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between">
            <LanguageToggle />
            <SheetClose asChild>
              <Link
                to="/settings"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/60 hover:border-white hover:text-white"
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
              </Link>
            </SheetClose>
          </div>
          <SheetClose asChild>
            <AuthAffordance className="flex items-center gap-2" />
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function SiteNavBar() {
  return (
    <div className="sticky top-0 z-40 bg-[color:var(--site-bg)]/90 backdrop-blur-md">
      <SiteHeader />
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
          <Link to="/stories" className="py-1 hover:text-white">
            {t("nav.stories")}
          </Link>
          <Link to="/footprints" className="py-1 hover:text-white">
            {t("nav.footprints")}
          </Link>
          <Link to="/diaries" className="py-1 hover:text-white">
            {t("nav.diaries")}
          </Link>
          <Link to="/collection/dear-today" className="py-1 hover:text-white">
            {t("nav.dearToday")}
          </Link>
          <Link to="/gallery" className="py-1 hover:text-white">
            {t("nav.gallery")}
          </Link>
          <Link to="/show" className="py-1 hover:text-white">
            {t("nav.show")}
          </Link>
          <Link to="/shop" className="py-1 hover:text-white">
            {t("nav.shop")}
          </Link>
          <Link to="/about" className="py-1 hover:text-white">
            {t("nav.about")}
          </Link>
          <Link to="/newsletter" className="py-1 hover:text-white">
            {t("nav.newsletter")}
          </Link>
          <Link to="/settings" className="py-1 hover:text-white">
            {t("nav.settingsLabel")}
          </Link>
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
