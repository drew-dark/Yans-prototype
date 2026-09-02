import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const authSearchSchema = z.object({
  // Present when arriving via a staff-only entry point (e.g. redirected from
  // /admin). Locks the page to sign-in — no self-signup for staff accounts.
  mode: z.enum(["signin"]).optional(),
});

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — The Last Mukwasu" }] }),
  validateSearch: authSearchSchema,
  component: AuthPage,
});

const STAFF_ROLES = ["admin", "editor", "moderator", "guest_author"];

async function routeAfterSignIn(userId: string): Promise<"/admin" | "/account"> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r: { role: string }) => r.role);
  return roles.some((r) => STAFF_ROLES.includes(r)) ? "/admin" : "/account";
}

function AuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { mode: lockedMode } = Route.useSearch();
  const staffOnly = lockedMode === "signin";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const to = await routeAfterSignIn(data.session.user.id);
        navigate({ to });
      }
    })();
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup" && !staffOnly) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/account" },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: "/account" });
        } else {
          toast.success(t("auth.checkEmail"));
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const to = await routeAfterSignIn(data.user.id);
        navigate({ to });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.somethingWrong"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 text-white">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <Link to="/" className="font-mono text-xs uppercase tracking-widest text-white/40 hover:text-white">
            ← The Last Mukwasu
          </Link>
          <h1 className="mt-4 font-display text-3xl uppercase tracking-tight">
            {staffOnly
              ? t("auth.studioSignIn")
              : mode === "signin"
                ? t("nav.signIn")
                : t("auth.createAccount")}
          </h1>
          <p className="mt-2 text-xs text-white/50">
            {staffOnly
              ? t("auth.staffOnlyBlurb")
              : mode === "signup"
                ? t("auth.signupBlurb")
                : t("auth.signinBlurb")}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="bg-neutral-900 border-neutral-800" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="bg-neutral-900 border-neutral-800" />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "…" : mode === "signin" ? t("nav.signIn") : t("auth.signUp")}
          </Button>
        </form>
        {!staffOnly && (
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-xs text-white/50 hover:text-white"
          >
            {mode === "signin" ? t("auth.needAccount") : t("auth.haveAccount")}
          </button>
        )}
      </div>
    </main>
  );
}
