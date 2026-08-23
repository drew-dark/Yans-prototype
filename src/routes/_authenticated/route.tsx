import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      // The studio (/admin) is staff-only and provisioned by appointment or
      // directly in Supabase — never offer self-signup on that path. Reader
      // areas (e.g. /account) keep the normal sign-in-or-create-account flow.
      const isStudio = location.pathname.startsWith("/admin");
      throw redirect({ to: "/auth", search: isStudio ? { mode: "signin" } : undefined });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
