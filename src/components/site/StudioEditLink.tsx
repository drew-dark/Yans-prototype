import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const STAFF = ["admin", "editor", "moderator", "guest_author"];

/** Shows an "Edit in Studio" affordance to staff on published public pages. */
export function StudioEditLink({ to, label = "Edit in Studio" }: { to: string; label?: string }) {
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      const staff = (data ?? []).some((r: { role: string }) => STAFF.includes(r.role));
      if (mounted) setIsStaff(staff);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (!isStaff) return null;

  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 border border-white/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-white/60 transition-colors hover:border-white hover:text-white"
    >
      ✎ {label}
    </Link>
  );
}
