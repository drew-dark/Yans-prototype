import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/site/SiteChrome";
import { Paginator } from "@/components/site/Paginator";
import { GridSkeleton } from "@/components/site/GridSkeleton";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { useMediaViewer } from "@/components/site/MediaViewer";
import { getEmbedThumbnail, isPlayable } from "@/lib/media";
import { BookmarkButton } from "@/components/site/BookmarkButton";
import { ReactionBar } from "@/components/site/Reactions";
import { CommentsSection } from "@/components/site/CommentsSection";
import {
  isRangeOutOfBounds,
  pageRangeBounds,
  totalPagesFor,
  useScrollTopOnPageChange,
  validatePageSearch,
} from "@/lib/pagination";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const PAGE_SIZE = 12;

export const Route = createFileRoute("/gallery")({
  validateSearch: validatePageSearch,
  head: () => ({
    meta: [
      { title: "Gallery — The Last Mukwasu" },
      {
        name: "description",
        content: "Photographs from Lusaka to Tokyo — quiet corners, faces, and light.",
      },
      { property: "og:title", content: "Gallery — The Last Mukwasu" },
      { property: "og:description", content: "Photographs from Lusaka to Tokyo." },
    ],
  }),
  component: GalleryPage,
});

type Photo = { id: string; image_url: string; caption: string | null; tags: string[] };

const galleryQuery = (page: number) => ({
  queryKey: ["public", "gallery", page] as const,
  queryFn: async () => {
    const { from, to } = pageRangeBounds(page, PAGE_SIZE);
    const { data, error, count } = await supabase
      .from("gallery_photos")
      .select("id, image_url, caption, tags", { count: "exact" })
      .eq("published", true)
      .order("sort_order")
      .range(from, to);
    if (error && !isRangeOutOfBounds(error)) throw error;
    return { photos: (data ?? []) as Photo[], total: count ?? 0 };
  },
});

function GalleryPage() {
  const { t } = useTranslation();
  const { page } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const qc = useQueryClient();
  const setPage = (p: number) => navigate({ search: { page: p } });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading, isFetching } = useQuery({
    ...galleryQuery(page),
    placeholderData: keepPreviousData,
  });

  const photos = data?.photos ?? [];
  const total = data?.total ?? 0;
  const selected = photos.find((p) => p.id === selectedId) ?? null;
  const totalPages = totalPagesFor(total, PAGE_SIZE);
  const { open } = useMediaViewer();

  useScrollTopOnPageChange(page);

  useEffect(() => {
    if (page < totalPages) qc.prefetchQuery(galleryQuery(page + 1));
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
            {t("collection.volumeLabel")}
          </p>
          <h1 className="font-display text-5xl uppercase leading-none tracking-tight sm:text-6xl md:text-8xl">
            {t("gallery.title")}
          </h1>
          <p className="mt-6 text-sm text-white/50 md:text-base">{t("gallery.intro")}</p>
        </div>

        {isLoading ? (
          <GridSkeleton
            count={PAGE_SIZE}
            className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-4 lg:grid-cols-4"
            itemClassName="aspect-square"
          />
        ) : photos.length === 0 ? (
          <p className="text-white/40">{t("gallery.empty")}</p>
        ) : (
          <>
            <div
              className={`grid grid-cols-2 gap-2 transition-opacity duration-200 motion-reduce:transition-none md:grid-cols-3 md:gap-4 lg:grid-cols-4 ${isFetching ? "opacity-50" : "opacity-100"}`}
            >
              {photos.map((p, i) => {
                const isVideo = isPlayable(p.image_url);
                const embedThumb = getEmbedThumbnail(p.image_url);
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedId(p.id);
                      open(
                        isVideo
                          ? { kind: "video", src: p.image_url, caption: p.caption ?? undefined }
                          : {
                              kind: "image",
                              src: p.image_url,
                              alt: p.caption ?? "",
                              caption: p.caption ?? undefined,
                            },
                      );
                    }}
                    className={`group relative overflow-hidden border border-white/10 bg-neutral-900 ${i % 5 === 0 ? "row-span-2 aspect-[3/4]" : "aspect-square"}`}
                    aria-label={
                      p.caption ?? (isVideo ? t("common.playVideo") : t("common.openImage"))
                    }
                  >
                    {isVideo ? (
                      embedThumb ? (
                        <img
                          src={embedThumb}
                          alt={p.caption ?? ""}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                        />
                      ) : (
                        <video
                          src={p.image_url}
                          muted
                          playsInline
                          preload="metadata"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                        />
                      )
                    ) : (
                      <img
                        src={p.image_url}
                        alt={p.caption ?? ""}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                      />
                    )}
                    {p.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100 motion-reduce:transition-none">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-white">
                          {p.caption}
                        </p>
                      </div>
                    )}
                    {isVideo && (
                      <span className="pointer-events-none absolute right-2 top-2 rounded bg-black/70 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-white/80">
                        ▶ {t("common.video")}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <Paginator
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              total={total}
              pageSize={PAGE_SIZE}
              currentCount={photos.length}
            />
            {selected && (
              <div className="mt-16 border-t border-white/10 pt-8">
                <div className="flex flex-wrap items-center gap-4">
                  {isPlayable(selected.image_url) ? (
                    <span className="flex h-16 w-16 items-center justify-center border border-white/10 bg-black/60 font-mono text-[10px] uppercase tracking-widest text-white/60">
                      ▶
                    </span>
                  ) : (
                    <img
                      src={selected.image_url}
                      alt=""
                      className="h-16 w-16 border border-white/10 object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-[12rem]">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                      {t("collection.selectedFrame")}
                    </p>
                    <p className="text-sm text-white/80">
                      {selected.caption ?? t("common.untitled")}
                    </p>
                  </div>
                  <BookmarkButton contentType="gallery" contentId={selected.id} />
                  <ReactionBar contentType="gallery" contentId={selected.id} />
                </div>
                <CommentsSection contentType="gallery" contentId={selected.id} />
              </div>
            )}
          </>
        )}

        <div className="mt-20">
          <NewsletterForm source="gallery" />
        </div>
      </section>
    </PageShell>
  );
}
