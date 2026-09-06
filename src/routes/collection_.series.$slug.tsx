import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/site/SiteChrome";
import type { Collection, Season, Volume } from "@/lib/taxonomy";

function SeriesNotFound() {
  const { t } = useTranslation();
  return (
    <PageShell>
      <div className="mx-auto max-w-2xl px-5 py-16 text-center md:py-24">
        <h1 className="font-display text-6xl uppercase">{t("detail.notFoundTitle")}</h1>
        <Link
          to="/collection"
          className="mt-6 inline-block font-mono text-xs uppercase tracking-widest text-white/60 hover:text-white"
        >
          {t("series.notFoundBackLink")}
        </Link>
      </div>
    </PageShell>
  );
}

export const Route = createFileRoute("/collection_/series/$slug")({
  head: ({ loaderData }) => {
    const c = loaderData as { title?: string; description?: string | null } | undefined;
    if (!c) return { meta: [{ title: "Collection" }, { name: "robots", content: "noindex" }] };
    return {
      meta: [
        { title: `${c.title} — Collection` },
        ...(c.description ? [{ name: "description", content: c.description }] : []),
      ],
    };
  },
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("collections")
      .select("*")
      .eq("slug", params.slug)
      .maybeSingle();
    if (!data) throw notFound();
    return data as Collection;
  },
  notFoundComponent: SeriesNotFound,
  component: SeriesPage,
});

type Item = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  volume_id: string | null;
  season_id: string | null;
  chapter_number: number | null;
  part_number: number | null;
  kind: "story" | "diary";
};

function SeriesPage() {
  const { t } = useTranslation();
  const params = Route.useParams();
  const { data: collection } = useQuery({
    queryKey: ["public", "collection", params.slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("slug", params.slug)
        .maybeSingle();
      if (error) throw error;
      return data as Collection | null;
    },
    initialData: Route.useLoaderData(),
  });

  const { data: volumes = [] } = useQuery({
    queryKey: ["public", "volumes", collection?.id],
    enabled: !!collection?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("volumes")
        .select("*")
        .eq("collection_id", collection!.id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Volume[];
    },
  });

  const { data: seasons = [] } = useQuery({
    queryKey: ["public", "seasons", collection?.id],
    enabled: !!collection?.id,
    queryFn: async () => {
      const volumeIds = volumes.map((v) => v.id);
      if (volumeIds.length === 0) return [];
      const { data, error } = await supabase
        .from("seasons")
        .select("*")
        .in("volume_id", volumeIds)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Season[];
    },
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["public", "collection-items", collection?.id],
    enabled: !!collection?.id,
    queryFn: async () => {
      const [stories, diaries] = await Promise.all([
        supabase
          .from("stories")
          .select("id, slug, title, excerpt, volume_id, season_id, chapter_number, part_number")
          .eq("collection_id", collection!.id)
          .eq("published", true),
        supabase
          .from("diary_entries")
          .select("id, slug, title, excerpt, volume_id, season_id, chapter_number, part_number")
          .eq("collection_id", collection!.id)
          .eq("published", true),
      ]);
      if (stories.error) throw stories.error;
      if (diaries.error) throw diaries.error;
      type Row = {
        id: string;
        slug: string;
        title: string;
        excerpt: string | null;
        volume_id: string | null;
        season_id: string | null;
        chapter_number: number | null;
        part_number: number | null;
      };
      const storyRows = (stories.data ?? []) as unknown as Row[];
      const diaryRows = (diaries.data ?? []) as unknown as Row[];
      const all: Item[] = [
        ...storyRows.map((s) => ({ ...s, kind: "story" as const })),
        ...diaryRows.map((d) => ({ ...d, kind: "diary" as const })),
      ];
      const volOrder = new Map(volumes.map((v, i) => [v.id, v.sort_order ?? i]));
      const seaOrder = new Map(seasons.map((s, i) => [s.id, s.sort_order ?? i]));
      return all.sort((a, b) => {
        const av = a.volume_id ? (volOrder.get(a.volume_id) ?? 999) : -1;
        const bv = b.volume_id ? (volOrder.get(b.volume_id) ?? 999) : -1;
        if (av !== bv) return av - bv;
        const as = a.season_id ? (seaOrder.get(a.season_id) ?? 999) : -1;
        const bs = b.season_id ? (seaOrder.get(b.season_id) ?? 999) : -1;
        if (as !== bs) return as - bs;
        const ac = a.chapter_number ?? 999;
        const bc = b.chapter_number ?? 999;
        if (ac !== bc) return ac - bc;
        return (a.part_number ?? 0) - (b.part_number ?? 0);
      });
    },
  });

  if (!collection) return null;

  // Group into Volume → Season → items for display, preserving sort order.
  const groups: { volume: Volume | null; season: Season | null; items: Item[] }[] = [];
  for (const item of items) {
    const volume = volumes.find((v) => v.id === item.volume_id) ?? null;
    const season = seasons.find((s) => s.id === item.season_id) ?? null;
    const last = groups[groups.length - 1];
    if (last && last.volume?.id === volume?.id && last.season?.id === season?.id) {
      last.items.push(item);
    } else {
      groups.push({ volume, season, items: [item] });
    }
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl px-5 py-10 md:px-12 md:py-16">
        <Link
          to="/collection"
          className="font-mono text-[10px] uppercase tracking-widest text-white/40 hover:text-white"
        >
          {t("series.backLink")}
        </Link>
        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.35em] text-kraft">
          {t("series.label")}
        </p>
        <h1 className="mt-2 font-display text-4xl uppercase leading-tight tracking-tight sm:text-5xl md:text-6xl">
          {collection.title}
        </h1>
        {collection.description && (
          <p className="mt-4 max-w-2xl text-white/60">{collection.description}</p>
        )}

        <div className="mt-12 space-y-12">
          {isLoading && <p className="text-white/40">{t("common.loading")}</p>}
          {!isLoading && groups.length === 0 && (
            <p className="text-white/40">{t("series.empty")}</p>
          )}
          {groups.map((group, i) => (
            <section key={i}>
              {(group.volume || group.season) && (
                <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.3em] text-white/50">
                  {group.volume?.title}
                  {group.volume && group.season && " · "}
                  {group.season?.title}
                </h2>
              )}
              <ul className="space-y-4">
                {group.items.map((item) => (
                  <li key={item.id} className="border-b border-white/5 pb-4">
                    <Link
                      to={item.kind === "story" ? "/stories/$slug" : "/diaries/$slug"}
                      params={{ slug: item.slug }}
                      className="group"
                    >
                      <p className="font-mono text-[10px] uppercase tracking-widest text-white/35">
                        {item.chapter_number != null && (
                          <>
                            {t("detail.chapter", { n: item.chapter_number })}
                            {item.part_number != null ? `.${item.part_number}` : ""} ·{" "}
                          </>
                        )}
                        {item.kind === "story" ? t("series.story") : t("series.diary")}
                      </p>
                      <h3 className="mt-1 font-display text-xl uppercase tracking-tight text-white/90 group-hover:text-white">
                        {item.title}
                      </h3>
                      {item.excerpt && (
                        <p className="mt-1 line-clamp-2 text-sm text-white/50">{item.excerpt}</p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
