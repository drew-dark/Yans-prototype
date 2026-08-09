import { createFileRoute, Outlet, Link, useRouterState, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const STAFF_ROLES = ["admin", "editor", "moderator", "guest_author"] as const;

const allNavItems = [
  { to: "/admin/hero", label: "Hero", roles: ["admin", "editor"] },
  { to: "/admin/collection", label: "Collection", roles: ["admin", "editor"] },
  { to: "/admin/taxonomy", label: "Taxonomy", roles: ["admin", "editor"] },
  { to: "/admin/stories", label: "Stories", roles: ["admin", "editor"] },
  { to: "/admin/diary", label: "Diary", roles: ["admin", "editor"] },
  { to: "/admin/dear-today", label: "Dear Today", roles: ["admin", "editor", "guest_author"] },
  { to: "/admin/gallery", label: "Gallery", roles: ["admin", "editor"] },
  { to: "/admin/shows", label: "Shows", roles: ["admin", "editor"] },
  { to: "/admin/shop", label: "Shop", roles: ["admin", "editor"] },
  { to: "/admin/about", label: "About", roles: ["admin", "editor"] },
  { to: "/admin/comments", label: "Comments", roles: ["admin", "moderator"] },
  { to: "/admin/users", label: "Users", roles: ["admin"] },
] as const;

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Yans Lounge" }] }),
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
  const navItems = allNavItems.filter((item) => item.roles.some((r) => roles.includes(r)));

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

  return (
    <div className="min-h-screen bg-[color:var(--site-bg)] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[color:var(--site-bg)]/85 backdrop-blur">

        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <Link to="/" className="shrink-0 font-display text-lg uppercase tracking-tight">
            Yans <span className="text-white/40">/ admin</span>
          </Link>
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
        <div className="mx-auto max-w-6xl px-4 pb-2 md:px-6">
          <nav className="flex flex-nowrap gap-1 overflow-x-auto pb-1 [scrollbar-width:none] md:flex-wrap md:overflow-visible [&::-webkit-scrollbar]:hidden">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-widest transition-colors ${
                    active
                      ? "border-kraft bg-kraft text-ink-dark"
                      : "border-white/15 text-white/60 hover:border-white/40 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
