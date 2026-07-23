import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const STAFF_ROLES = ["admin", "editor", "moderator", "guest_author"];

export const Route = createFileRoute("/_authenticated/admin/")({
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth" });
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const roles = (data ?? []).map((r: { role: string }) => r.role);
    if (roles.includes("admin") || roles.includes("editor")) throw redirect({ to: "/admin/collection" });
    if (roles.includes("moderator")) throw redirect({ to: "/admin/comments" });
    if (roles.includes("guest_author")) throw redirect({ to: "/admin/dear-today" });
    throw redirect({ to: "/account" });
  },
});
