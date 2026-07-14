import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/admin/collection", label: "Collection" },
  { to: "/admin/stories", label: "Stories" },
  { to: "/admin/diary", label: "Diary" },
  { to: "/admin/gallery", label: "Gallery" },
  { to: "/admin/shop", label: "Shop" },
  { to: "/admin/about", label: "About" },
] as const;

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Yans Lounge" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
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
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
      setChecking(false);
    })();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-white/60">Loading…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 text-white">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="font-display text-3xl uppercase">Not authorized</h1>
          <p className="text-sm text-white/60">
            Signed in as <span className="font-mono">{email}</span>. Ask the site owner
            to grant you the <span className="font-mono">admin</span> role.
          </p>
          <Button variant="outline" onClick={signOut}>Sign out</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-white/10 bg-neutral-900/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-display text-lg uppercase tracking-tight">
              Yans <span className="text-white/40">/ admin</span>
            </Link>
            <nav className="hidden gap-1 md:flex">
              {navItems.map((item) => {
                const active = pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`rounded px-3 py-1.5 text-xs uppercase tracking-widest transition-colors ${
                      active ? "bg-white text-neutral-950" : "text-white/60 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="hidden text-white/40 md:inline">{email}</span>
            <Button size="sm" variant="ghost" onClick={signOut}>Sign out</Button>
          </div>
        </div>
        <nav className="flex overflow-x-auto border-t border-white/10 px-4 py-2 md:hidden">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`whitespace-nowrap px-3 py-1 text-xs uppercase tracking-widest ${active ? "text-white" : "text-white/50"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
