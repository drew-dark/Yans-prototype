import { createFileRoute, Outlet, Link, useRouterState, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

const STAFF_ROLES = ["admin", "editor", "moderator", "guest_author"] as const;

// Grouped so the sidebar reads as sections instead of one flat wall of
// 16 same-looking links — "Collection" (legacy gallery tiles) and
// "Collections" (the Library system) sit in different groups on
// purpose, since their near-identical names were easy to confuse
// stacked together in a single list.
const NAV_GROUPS = [
  {
    label: "Content",
    items: [
      { to: "/admin/stories", label: "Stories", roles: ["admin", "editor"] },
      { to: "/admin/diary", label: "Diary", roles: ["admin", "editor"] },
      { to: "/admin/dear-today", label: "Dear Today", roles: ["admin", "editor", "guest_author"] },
      { to: "/admin/gallery", label: "Gallery Tiles", roles: ["admin", "editor"] },
      { to: "/admin/collection", label: "Muyan Tiles (legacy)", roles: ["admin", "editor"] },
      { to: "/admin/footprints", label: "Footprints", roles: ["admin", "editor"] },
      { to: "/admin/shows", label: "Shows", roles: ["admin", "editor"] },
    ],
  },
  {
    label: "Collections",
    items: [
      { to: "/admin/collections", label: "Library & entries", roles: ["admin", "editor"] },
      { to: "/admin/taxonomy", label: "Taxonomy (volumes/seasons)", roles: ["admin", "editor"] },
    ],
  },
  {
    label: "Homepage & shop",
    items: [
      { to: "/admin/hero", label: "Homepage hero", roles: ["admin", "editor"] },
      { to: "/admin/shop", label: "Shop", roles: ["admin", "editor"] },
      { to: "/admin/about", label: "About page", roles: ["admin", "editor"] },
      { to: "/admin/theme", label: "Theme", roles: ["admin"] },
    ],
  },
  {
    label: "Community",
    items: [
      { to: "/admin/comments", label: "Comments", roles: ["admin", "moderator"] },
      { to: "/admin/newsletter", label: "Newsletter", roles: ["admin"] },
      { to: "/admin/users", label: "Users", roles: ["admin"] },
    ],
  },
] as const;

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — The Last Mukwasu" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [checking, setChecking] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      setEmail(userData.user?.email ?? null);
      if (!userData.user) {
        setChecking(false);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);
      setRoles((data ?? []).map((r: { role: string }) => r.role));
      setChecking(false);
    })();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const hasStaff = roles.some((r) => (STAFF_ROLES as readonly string[]).includes(r));
  const visibleGroups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => item.roles.some((r) => roles.includes(r))),
  })).filter((g) => g.items.length > 0);

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-white/60">Loading…</div>;
  }

  if (!hasStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 text-white">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="font-display text-3xl uppercase">Reader account</h1>
          <p className="text-sm text-white/60">
            Signed in as <span className="font-mono">{email}</span>. The studio is for staff. Head to your account to manage bookmarks and profile.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => navigate({ to: "/account" })}>Go to your account</Button>
            <Button variant="outline" onClick={signOut}>Sign out</Button>
          </div>
        </div>
      </div>
    );
  }

  const navContent = (
    <nav className="space-y-6">
      {visibleGroups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-white/30">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`block border-l-2 px-3 py-1.5 text-[12px] transition-colors ${
                    active
                      ? "border-kraft bg-kraft/10 text-white"
                      : "border-transparent text-white/55 hover:border-white/25 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[color:var(--site-bg)] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[color:var(--site-bg)]/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Sheet>
              <SheetTrigger className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-white/15 text-white/60 hover:border-white/40 hover:text-white lg:hidden">
                <Menu className="h-4 w-4" aria-hidden="true" />
              </SheetTrigger>
              <SheetContent side="left" className="w-72 border-white/10 bg-neutral-950 p-0 text-white">
                <SheetHeader className="border-b border-white/10 px-5 py-4 text-left">
                  <SheetTitle className="font-display text-lg uppercase tracking-tight text-white">
                    Yans <span className="text-white/40">/ admin</span>
                  </SheetTitle>
                </SheetHeader>
                <div className="overflow-y-auto p-5">
                  <SheetClose asChild>
                    <div>{navContent}</div>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
            <Link to="/" className="shrink-0 font-display text-lg uppercase tracking-tight">
              Yans <span className="text-white/40">/ admin</span>
            </Link>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="hidden max-w-[180px] truncate text-white/40 md:inline">{email}</span>
            <Link
              to="/settings"
              className="rounded-full border border-white/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-white/60 hover:border-white hover:text-white"
            >
              Settings
            </Link>
            <Button size="sm" variant="ghost" onClick={signOut}>Sign out</Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8 md:px-6">
        <aside className="hidden w-56 shrink-0 lg:block">{navContent}</aside>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
