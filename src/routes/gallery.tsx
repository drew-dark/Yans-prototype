import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/site/SiteChrome";
import { Paginator } from "@/components/site/Paginator";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { useMediaViewer } from "@/components/site/MediaViewer";
import { BookmarkButton } from "@/components/site/BookmarkButton";
import { CommentsSection } from "@/components/site/CommentsSection";
import { useEffect, useState } from "react";

const PAGE_SIZE = 12;
const VIDEO_RE = /\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i;

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery — Emmanuel Rayan Daka" },
      { name: "description", content: "Photographs from Lusaka to Tokyo — quiet corners, faces, and light." },
      { property: "og:title", content: "Gallery — Yans Lounge" },
      { property: "og:description", content: "Photographs from Lusaka to Tokyo." },
    ],
  }),
  component: GalleryPage,
});

type Photo = { id: string; image_url: string; caption: string | null; tags: string[] };

function GalleryPage() {
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["public", "gallery", page],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await supabase
        .from("gallery_photos")
        .select("id, image_url, caption, tags", { count: "exact" })
        .eq("published", true)
        .order("sort_order")
        .range(from, to);
      if (error) throw error;
      return { photos: data as Photo[], total: count ?? 0 };
    },
  });

  const photos = data?.photos ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  const { open } = useMediaViewer();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  return (
    <PageShell>
      <section className="mx-auto max-w-6xl px-6 py-16 md:px-12">
        <div className="mb-12 max-w-2xl">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.4em] text-white/40">Volume 01</p>
          <h1 className="font-display text-6xl uppercase leading-none tracking-tight md:text-8xl">Gallery</h1>
          <p className="mt-6 text-sm text-white/50 md:text-base">
            Snapshots collected between two homes. Click any frame to see it fuller.
          </p>
        </div>

        {isLoading ? (
          <p className="text-white/40">Developing frames…</p>
        ) : photos.length === 0 ? (
          <p className="text-white/40">No photographs published yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
              {photos.map((p, i) => {
                const isVideo = VIDEO_RE.test(p.image_url);
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedId(p.id);
                      open(
                        isVideo
                          ? { kind: "video", src: p.image_url, caption: p.caption ?? undefined }
                          : { kind: "image", src: p.image_url, alt: p.caption ?? "", caption: p.caption ?? undefined },
                      );
                    }}
                    className={`group relative overflow-hidden border border-white/10 bg-neutral-900 ${i % 5 === 0 ? "row-span-2 aspect-[3/4]" : "aspect-square"}`}
                    aria-label={p.caption ?? (isVideo ? "Play video" : "Open image")}
                  >
                    {isVideo ? (
                      <video
                        src={p.image_url}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                      />
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
                        <p className="font-mono text-[10px] uppercase tracking-widest text-white">{p.caption}</p>
                      </div>
                    )}
                    {isVideo && (
                      <span className="pointer-events-none absolute right-2 top-2 rounded bg-black/70 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-white/80">
                        ▶ Video
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <Paginator page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}

        <div className="mt-20">
          <NewsletterForm source="gallery" />
        </div>
      </section>
    </PageShell>
  );
}
