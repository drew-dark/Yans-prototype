import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, UserPlus, UserCheck, Heart } from "lucide-react";

type NotificationRow = {
  id: string;
  actor_id: string;
  type: "friend_request" | "friend_accept" | "new_follower";
  read: boolean;
  created_at: string;
};

type ActorProfile = { user_id: string; username: string | null; display_name: string | null; avatar_url: string | null };

function useSessionUserId() {
  const [userId, setUserId] = useState<string | null>(null);
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
  return userId;
}

const ICONS = { friend_request: UserPlus, friend_accept: UserCheck, new_follower: Heart } as const;

export function NotificationBell() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const userId = useSessionUserId();
  const [open, setOpen] = useState(false);
  const [justBumped, setJustBumped] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", userId],
    enabled: !!userId,
    // Polling rather than a realtime subscription — simple, and good
    // enough for "you have a new request" rather than instant delivery.
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, actor_id, type, read, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as NotificationRow[];
    },
  });

  const actorIds = Array.from(new Set(notifications.map((n) => n.actor_id)));
  const { data: actorsById = {} } = useQuery({
    queryKey: ["notification_actors", actorIds],
    enabled: actorIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", actorIds);
      if (error) throw error;
      return Object.fromEntries((data as ActorProfile[]).map((p) => [p.user_id, p]));
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (unreadCount === 0) return;
    setJustBumped(true);
    const id = setTimeout(() => setJustBumped(false), 400);
    return () => clearTimeout(id);
  }, [unreadCount]);

  async function markAllRead() {
    if (!userId || unreadCount === 0) return;
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
    if (!error) qc.invalidateQueries({ queryKey: ["notifications", userId] });
  }

  async function markOneRead(id: string) {
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
    if (!error) qc.invalidateQueries({ queryKey: ["notifications", userId] });
  }

  if (!userId) return null;

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        // Mark read on close, not open — otherwise the unread dot next to
        // each item would already be cleared by the time the list
        // re-renders, defeating the point of showing it while open.
        if (!v) markAllRead();
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("notifications.title")}
          className="surface-button relative px-2.5 py-1 text-white/70 hover:text-white"
        >
          <Bell className="h-3.5 w-3.5" />
          {unreadCount > 0 && (
            <span
              className={`absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-kraft px-1 font-mono text-[9px] font-bold text-ink-dark transition-transform duration-300 ${
                justBumped ? "scale-125" : "scale-100"
              }`}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 border-white/10 bg-black/95 p-0">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/60">
            {t("notifications.title")}
          </p>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-white/40">{t("notifications.empty")}</p>
          ) : (
            notifications.map((n) => {
              const actor = actorsById[n.actor_id];
              const Icon = ICONS[n.type];
              const to = n.type === "new_follower" && actor?.username ? `/footsteps/${actor.username}` : "/account/friends";
              return (
                <Link
                  key={n.id}
                  to={to}
                  onClick={() => markOneRead(n.id)}
                  className={`flex items-center gap-3 border-b border-white/5 px-4 py-3 text-sm hover:bg-white/[0.04] ${
                    n.read ? "text-white/50" : "text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-kraft" />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{actor?.display_name ?? actor?.username ?? "Someone"}</span>{" "}
                    {t(`notifications.${n.type}`)}
                  </span>
                  {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-kraft" />}
                </Link>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
