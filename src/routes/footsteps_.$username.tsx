import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/site/SiteChrome";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { THEMES, type ThemeId } from "@/components/site/ThemeProvider";
import { Palette } from "lucide-react";
import { FollowButton } from "@/components/site/SocialButtons";
import { toast } from "sonner";

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
      .select(
        "user_id, display_name, avatar_url, username, footsteps_visible, footsteps_theme, footsteps_tagline, footsteps_banner_url",
      )
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

function isThemeId(v: string | null): v is ThemeId {
  return !!v && THEMES.some((t) => t.id === v);
}

function FootstepsPage() {
  const { t } = useTranslation();
  const loaded = Route.useLoaderData();
  const qc = useQueryClient();
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  // Local, editable copy of the customizable fields — the loader snapshot
  // stays as the initial value, but saving customization updates this
  // directly rather than requiring a full route reload to see the result.
  const [profile, setProfile] = useState(loaded);
  const [showCustomize, setShowCustomize] = useState(false);
  const [tagline, setTagline] = useState(loaded.footsteps_tagline ?? "");
  const [banner, setBanner] = useState(loaded.footsteps_banner_url ?? "");
  const [pageTheme, setPageTheme] = useState<string>(loaded.footsteps_theme ?? "");
  const [savingCustomize, setSavingCustomize] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setViewerId(data.user?.id ?? null));
  }, []);

  const isOwner = viewerId !== null && viewerId === profile.user_id;
  const resolvedTheme: ThemeId = isThemeId(profile.footsteps_theme) ? profile.footsteps_theme : "kraft";

  const { data: isFollowing = false } = useQuery({
    queryKey: ["is_following", viewerId, profile.user_id],
    enabled: !!viewerId && !isOwner,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", viewerId as string)
        .eq("followed_id", profile.user_id)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  async function toggleFollow() {
    if (!viewerId) return;
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", viewerId)
          .eq("followed_id", profile.user_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({ follower_id: viewerId, followed_id: profile.user_id });
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["is_following", viewerId, profile.user_id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("footsteps.followError"));
    }
  }

  async function saveCustomization() {
    setSavingCustomize(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          footsteps_tagline: tagline.trim() || null,
          footsteps_banner_url: banner || null,
          footsteps_theme: pageTheme || null,
        })
        .eq("user_id", profile.user_id);
      if (error) throw error;
      setProfile({
        ...profile,
        footsteps_tagline: tagline.trim() || null,
        footsteps_banner_url: banner || null,
        footsteps_theme: pageTheme || null,
      });
      setShowCustomize(false);
      toast.success(t("footsteps.customizeSaved"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("footsteps.customizeError"));
    } finally {
      setSavingCustomize(false);
    }
  }

  async function postReflection() {
    if (!draft.trim() || !viewerId) return;
    setPosting(true);
    try {
      const { error } = await supabase
        .from("reflections")
        .insert({ user_id: viewerId, body: draft.trim() });
      if (error) throw error;
      setDraft("");
      qc.invalidateQueries({ queryKey: ["footsteps", profile.user_id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("footsteps.postError"));
    } finally {
      setPosting(false);
    }
  }

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
    // Scoped to this page only — [data-theme="…"] just sets CSS custom
    // properties (--kraft, --site-bg, etc.) that inherit down to
    // everything inside this div, so a visitor's own site-wide theme
    // (or the one they're browsing as a guest) is untouched once they
    // navigate away.
    <div data-theme={resolvedTheme}>
      <PageShell>
        {profile.footsteps_banner_url && (
          <div className="h-40 w-full overflow-hidden md:h-56">
            <img
              src={profile.footsteps_banner_url}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="mx-auto max-w-2xl px-5 py-16">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {profile.avatar_url && (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-16 w-16 rounded-full object-cover"
                />
              )}
              <div>
                <h1 className="font-display text-3xl">{profile.display_name ?? profile.username}</h1>
                {profile.footsteps_tagline && (
                  <p className="mt-1 text-sm text-white/60">{profile.footsteps_tagline}</p>
                )}
              </div>
            </div>
            {isOwner && (
              <button
                type="button"
                onClick={() => setShowCustomize((v) => !v)}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-white/60 hover:border-kraft hover:text-white"
              >
                <Palette className="h-3 w-3" />
                {t("footsteps.customize")}
              </button>
            )}
            {!isOwner && viewerId && (
              <FollowButton isFollowing={isFollowing} onToggle={toggleFollow} />
            )}
          </div>

          {isOwner && showCustomize && (
            <div className="mt-6 space-y-5 rounded border border-kraft/40 bg-kraft/5 p-5">
              <div>
                <label className="text-xs uppercase tracking-widest text-white/60">
                  {t("footsteps.tagline")}
                </label>
                <Input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value.slice(0, 140))}
                  placeholder={t("footsteps.taglinePlaceholder")}
                  maxLength={140}
                  className="mt-2 border-white/15 bg-black/40"
                />
                <p className="mt-1 text-right font-mono text-[10px] text-white/30">
                  {tagline.length}/140
                </p>
              </div>

              <ImageUpload
                value={banner}
                onChange={setBanner}
                folder="footsteps-banners"
                label={t("footsteps.banner")}
                accept="image/*"
              />

              <div>
                <label className="text-xs uppercase tracking-widest text-white/60">
                  {t("footsteps.accent")}
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {THEMES.map((th) => (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => setPageTheme(th.id)}
                      title={th.label}
                      aria-pressed={pageTheme === th.id}
                      className={`h-8 w-8 rounded-full border-2 transition-transform ${
                        pageTheme === th.id
                          ? "scale-110 border-white"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: th.swatch }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowCustomize(false)}>
                  {t("footsteps.cancel")}
                </Button>
                <Button size="sm" disabled={savingCustomize} onClick={saveCustomization}>
                  {savingCustomize ? t("footsteps.saving") : t("footsteps.save")}
                </Button>
              </div>
            </div>
          )}

          {isOwner && (
            <div className="mt-8 space-y-2 border-b border-white/10 pb-8">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t("footsteps.composePlaceholder")}
                className="min-h-[90px] border-white/15 bg-white/5"
              />
              <div className="flex justify-end">
                <Button onClick={postReflection} disabled={posting || !draft.trim()}>
                  {posting ? t("footsteps.posting") : t("footsteps.post")}
                </Button>
              </div>
            </div>
          )}

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
    </div>
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
