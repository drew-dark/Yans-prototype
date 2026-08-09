import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/site/SiteChrome";
import { LivePlayer } from "@/components/site/LivePlayer";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { useState } from "react";

export const Route = createFileRoute("/show")({
  head: () => ({
    meta: [
      { title: "The Show — Emmanuel Rayan Daka" },
      {
        name: "description",
        content:
          "Watch the live broadcast and catch up on past episodes of the show from Lusaka to Tokyo.",
      },
      { property: "og:title", content: "The Show — Live broadcast" },
      {
        property: "og:description",
        content: "Live broadcasts and past episodes with Emmanuel Rayan Daka.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ShowPage,
});

type Show = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  playback_url: string | null;
  recording_url: string | null;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
};

function fmt(dt: string | null) {
  if (!dt) return null;
  return new Date(dt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function ShowPage() {
  const [replay, setReplay] = useState<Show | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["public", "shows"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shows")
        .select(
          "id, title, slug, description, cover_url, playback_url, recording_url, status, scheduled_at, started_at",
        )
        .eq("published", true)
        .order("scheduled_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Show[];
    },
  });

  const shows = data ?? [];
  const live = shows.find((s) => s.status === "live" && s.playback_url);
  const upcoming = shows
    .filter((s) => s.status === "offline" && s.scheduled_at)
    .sort((a, b) => (a.scheduled_at! < b.scheduled_at! ? -1 : 1))[0];
  const past = shows.filter((s) => s.status === "ended");

  return (
    <PageShell>
      <section className="mx-auto max-w-6xl px-5 py-10 md:px-12 md:py-16">
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.4em] text-kraft before:block before:h-px before:w-8 before:bg-kraft/60">
            On air
          </p>
          <h1 className="font-display text-5xl uppercase leading-none tracking-tight sm:text-6xl md:text-8xl">
            The Show
          </h1>
          <p className="mt-6 text-sm text-white/50 md:text-base">
            Live broadcasts, conversations and readings — plus every past episode.
          </p>
        </div>

        {isLoading ? (
          <div className="aspect-video w-full animate-pulse border border-white/10 bg-white/5" />
        ) : live ? (
          <div className="border border-white/10">
            <LivePlayer src={live.playback_url!} poster={live.cover_url ?? undefined} live />
            <div className="p-4 md:p-6">
              <h2 className="font-display text-2xl uppercase tracking-tight md:text-4xl">
                {live.title}
              </h2>
              {live.description && (
                <p className="mt-2 text-sm text-white/60">{live.description}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 border border-white/10 bg-black/40 px-6 py-16 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40">
              Off air
            </p>
            <p className="text-sm text-white/60">
              {upcoming
                ? `Next broadcast: ${upcoming.title} — ${fmt(upcoming.scheduled_at)}`
                : "No broadcast running right now. Check back soon."}
            </p>
          </div>
        )}

        <div className="mt-16">
          <h2 className="mb-6 font-display text-3xl uppercase tracking-tight md:text-5xl">
            Past episodes
          </h2>
          {past.length === 0 ? (
            <p className="text-white/40">No episodes archived yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {past.map((s) => (
                <article key={s.id} className="border border-white/10 bg-black/30">
                  <button
                    type="button"
                    onClick={() => setReplay(s)}
                    disabled={!s.recording_url}
                    className="group block w-full overflow-hidden disabled:cursor-not-allowed"
                    aria-label={`Play ${s.title}`}
                  >
                    {s.cover_url ? (
                      <img
                        src={s.cover_url}
                        alt={s.title}
                        loading="lazy"
                        className="aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                      />
                    ) : (
                      <div className="flex aspect-video w-full items-center justify-center bg-white/5 font-mono text-[10px] uppercase tracking-widest text-white/40">
                        {s.recording_url ? "▶ Replay" : "No recording"}
                      </div>
                    )}
                  </button>
                  <div className="p-4">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                      {fmt(s.started_at ?? s.scheduled_at) ?? "Archive"}
                    </p>
                    <h3 className="mt-1 font-display text-xl uppercase tracking-tight">
                      {s.title}
                    </h3>
                    {s.description && (
                      <p className="mt-2 line-clamp-3 text-sm text-white/55">{s.description}</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {replay?.recording_url && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={replay.title}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4"
            onClick={() => setReplay(null)}
          >
            <div className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
              <LivePlayer src={replay.recording_url} poster={replay.cover_url ?? undefined} />
              <p className="mt-3 text-center font-mono text-xs uppercase tracking-widest text-white/70">
                {replay.title}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReplay(null)}
              aria-label="Close player"
              className="absolute right-6 top-6 font-mono text-xs uppercase tracking-widest text-white/60 hover:text-white"
            >
              Close ✕
            </button>
          </div>
        )}

        <div className="mt-20">
          <NewsletterForm source="show" />
        </div>
      </section>
    </PageShell>
  );
}
