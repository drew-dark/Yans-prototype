import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/site/SiteChrome";

export const Route = createFileRoute("/footsteps_/$username")({
  head: ({ loaderData }) => {
    const p = loaderData as { display_name?: string | null } | undefined;
    const name = p?.display_name ?? "Footsteps";
    return {
      meta: [
        { title: `${name} — Footsteps` },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, username, footsteps_visible")
      .eq("username", params.username)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound();
    return data;
  },
  component: FootstepsPage,
});

type TimelineItem =
  | { kind: "reflection"; id: string; created_at: string; body: string }
  | { kind: "reaction"; id: string; created_at: string; emoji: string; content_type: string }
  | { kind: "comment"; id: string; created_at: string; body: string; content_type: string }
  | { kind: "view"; id: string; created_at: string; content_type: string };

function FootstepsPage() {
  const { t } = useTranslation();
  const profile = Route.useLoaderData();

  const { data: timeline = [], isLoading } = useQuery({
    queryKey: ["footsteps", profile.user_id],
    // Loader already checked the profile exists; if footsteps_visible is
    // false we skip fetching activity entirely rather than fetching and
    // hiding it client-side.
    enabled: profile.footsteps_visible,
    queryFn: async () => {
      const uid = profile.user_id;
      const [reflections, reactions, comments, views] = await Promise.all([
        supabase
          .from("reflections")
          .select("id, created_at, body")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("reactions")
          .select("id, created_at, emoji, content_type")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("comments")
          .select("id, created_at, body, content_type")
          .eq("user_id", uid)
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("content_views")
          .select("content_id, content_type, first_viewed_at")
          .eq("user_id", uid)
          .order("first_viewed_at", { ascending: false })
          .limit(50),
      ]);

      const items: TimelineItem[] = [
        ...(reflections.data ?? []).map((r) => ({ kind: "reflection" as const, ...r })),
        ...(reactions.data ?? []).map((r) => ({ kind: "reaction" as const, ...r })),
        ...(comments.data ?? []).map((c) => ({ kind: "comment" as const, ...c })),
        ...(views.data ?? []).map((v) => ({
          kind: "view" as const,
          id: `${v.content_type}-${v.content_id}`,
          created_at: v.first_viewed_at,
          content_type: v.content_type,
        })),
      ];

      return items.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    },
  });

  return (
    <PageShell>
      <div className="mx-auto max-w-2xl px-5 py-16">
        <div className="flex items-center gap-4">
          {profile.avatar_url && (
            <img
              src={profile.avatar_url}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
            />
          )}
          <h1 className="font-display text-3xl">{profile.display_name ?? profile.username}</h1>
        </div>

        {!profile.footsteps_visible ? (
          <p className="mt-10 font-mono text-xs uppercase tracking-widest text-white/60">
            {t("footsteps.private")}
          </p>
        ) : isLoading ? (
          <p className="mt-10 text-white/60">{t("footsteps.loading")}</p>
        ) : timeline.length === 0 ? (
          <p className="mt-10 text-white/60">{t("footsteps.empty")}</p>
        ) : (
          <ul className="mt-10 space-y-4">
            {timeline.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="border-b border-white/10 pb-4">
                <TimelineRow item={item} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}

function TimelineRow({ item }: { item: TimelineItem }) {
  const { t } = useTranslation();
  switch (item.kind) {
    case "reflection":
      return <p>{item.body}</p>;
    case "comment":
      return <p className="text-white/80">{item.body}</p>;
    case "reaction":
      return (
        <p className="text-white/60">
          {t("footsteps.reacted", { emoji: item.emoji, type: item.content_type })}
        </p>
      );
    case "view":
      return <p className="text-white/60">{t("footsteps.read", { type: item.content_type })}</p>;
  }
}
