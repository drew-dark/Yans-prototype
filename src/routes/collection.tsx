import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/site/SiteChrome";
import { Paginator } from "@/components/site/Paginator";
import { GridSkeleton } from "@/components/site/GridSkeleton";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { useMediaViewer, mediaItemFor } from "@/components/site/MediaViewer";
import { getEmbedThumbnail, isPlayable } from "@/lib/media";
import { BookmarkButton } from "@/components/site/BookmarkButton";
import { CommentsSection } from "@/components/site/CommentsSection";
import { isRangeOutOfBounds, pageRangeBounds, totalPagesFor, useScrollTopOnPageChange, validatePageSearch } from "@/lib/pagination";
import portraitImg from "@/assets/muyan-portrait.jpg";
import broadcastImg from "@/assets/muyan-broadcast.jpg";
import foodImg from "@/assets/muyan-food.jpg";
import verseImg from "@/assets/muyan-verse.jpg";
import stageImg from "@/assets/muyan-stage.jpg";

const PAGE_SIZE = 8;

export const Route = createFileRoute("/collection")({
  validateSearch: validatePageSearch,
  head: () => ({
    meta: [
      { title: "The Last Mukwasu — Poetry & Stories" },
      {
        name: "description",
        content:
          "The Last Mukwasu — a curated set of frames tracing verse, broadcast, portrait, and stage across Lusaka and Tokyo.",
      },
      { property: "og:title", content: "The Last Mukwasu — Poetry & Stories" },
      {
        property: "og:description",
        content: "A curated set of frames — verse, broadcast, portrait, and stage.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: CollectionPage,
});

type Tile = { id: string; image_url: string; label: string };

const fallbackTiles: Tile[] = [
  { id: "1", image_url: portraitImg, label: "Portrait" },
  { id: "2", image_url: broadcastImg, label: "Broadcast" },
  { id: "3", image_url: foodImg, label: "Culture" },
  { id: "4", image_url: verseImg, label: "Verse" },
  { id: "5", image_url: stageImg, label: "Stage" },
  { id: "6", image_url: portraitImg, label: "Studio" },
  { id: "7", image_url: broadcastImg, label: "Field" },
  { id: "8", image_url: foodImg, label: "Table" },
];

const collectionQuery = (page: number) => ({
  queryKey: ["public", "collection_items", page] as const,
  queryFn: async () => {
    const { from, to } = pageRangeBounds(page, PAGE_SIZE);
    const { data, error, count } = await supabase
      .from("collection_items")
      .select("id, image_url, label", { count: "exact" })
      .eq("published", true)
      .order("sort_order")
      .range(from, to);
    if (error && !isRangeOutOfBounds(error)) throw error;
    return { items: (data ?? []) as Tile[], total: count ?? 0 };
  },
});

function CollectionPage() {
  const { page } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const qc = useQueryClient();
  const setPage = (p: number) => navigate({ search: { page: p } });

  const { data, isLoading, isFetching } = useQuery({
    ...collectionQuery(page),
    placeholderData: keepPreviousData,
  });

  const usingFallback = !!data && data.total === 0;
  const tiles = usingFallback ? fallbackTiles : (data?.items ?? []);
  const total = usingFallback ? 0 : (data?.total ?? 0);
  const totalPages = totalPagesFor(total, PAGE_SIZE);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const selected = tiles.find((t) => t.id === selectedId && UUID_RE.test(t.id)) ?? null;

  const { open } = useMediaViewer();

  useScrollTopOnPageChange(page);

  useEffect(() => {
    if (page < totalPages) qc.prefetchQuery(collectionQuery(page + 1));
  }, [page, totalPages, qc]);

  useEffect(() => {
    if (data && page > totalPages) setPage(totalPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, page, totalPages]);

  return (
    <PageShell>
      <section className="mx-auto max-w-6xl px-5 py-10 md:px-12 md:py-16">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.4em] text-kraft before:block before:h-px before:w-8 before:bg-kraft/60">
            Volume 01
          </p>
          <h1 className="font-display text-5xl uppercase leading-none tracking-tight sm:text-6xl md:text-8xl">
            The Last Mukwasu
          </h1>
          <p className="mt-6 text-sm text-white/50 md:text-base">
            Frames pulled from the quiet places — portrait, broadcast, verse,
            culture, and the stages in between. Tap any card to open it fuller.
          </p>
        </div>

        {isLoading ? (
          <GridSkeleton
            count={PAGE_SIZE}
            className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
            itemClassName="aspect-[3/4]"
          />
        ) : (
          <>
            <div
              className={`grid grid-cols-2 gap-4 transition-opacity duration-200 motion-reduce:transition-none md:grid-cols-3 lg:grid-cols-4 ${isFetching ? "opacity-50" : "opacity-100"}`}
            >
              {tiles.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(t.id);
                    open(mediaItemFor(t.image_url, t.label));
                  }}
                  className="group relative aspect-[3/4] overflow-hidden border border-white/10 bg-neutral-900 text-left"
                  aria-label={t.label}
                >
                  {isPlayable(t.image_url) && !getEmbedThumbnail(t.image_url) ? (
                    <video
                      src={t.image_url}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={getEmbedThumbnail(t.image_url) ?? t.image_url}
                      alt={t.label}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                  {isPlayable(t.image_url) && (
                    <span className="pointer-events-none absolute right-2 top-2 rounded bg-black/70 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-white/80">
                      ▶ Video
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-white">
                      {t.label}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            {!usingFallback && (
              <Paginator
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                total={total}
                pageSize={PAGE_SIZE}
                currentCount={tiles.length}
              />
            )}
          </>
        )}

        {selected && (
          <div className="mt-16 border-t border-white/10 pt-8">
            <div className="flex flex-wrap items-center gap-4">
              <img src={selected.image_url} alt="" className="h-16 w-16 border border-white/10 object-cover" />
              <div className="flex-1 min-w-[12rem]">
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">Selected frame</p>
                <p className="text-sm text-white/80">{selected.label}</p>
              </div>
              <BookmarkButton contentType="collection_item" contentId={selected.id} />
            </div>
            <CommentsSection contentType="collection_item" contentId={selected.id} />
          </div>
        )}

        <div className="mt-16 flex items-center justify-between border-t border-white/10 pt-6 font-mono text-[10px] uppercase tracking-widest text-white/40">
          <span>The Last Mukwasu · Series 01</span>
          <Link to="/gallery" className="hover:text-white">
            View full gallery →
          </Link>
        </div>

        <div className="mt-20">
          <NewsletterForm source="collection" />
        </div>
      </section>
    </PageShell>
  );
}
