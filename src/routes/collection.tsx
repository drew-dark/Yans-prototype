import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/site/SiteChrome";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { useMediaViewer } from "@/components/site/MediaViewer";
import { BookmarkButton } from "@/components/site/BookmarkButton";
import { CommentsSection } from "@/components/site/CommentsSection";
import portraitImg from "@/assets/muyan-portrait.jpg";
import broadcastImg from "@/assets/muyan-broadcast.jpg";
import foodImg from "@/assets/muyan-food.jpg";
import verseImg from "@/assets/muyan-verse.jpg";
import stageImg from "@/assets/muyan-stage.jpg";

export const Route = createFileRoute("/collection")({
  head: () => ({
    meta: [
      { title: "Muyan Collection — Emmanuel Rayan Daka" },
      {
        name: "description",
        content:
          "The Muyan Collection — a curated set of frames tracing verse, broadcast, portrait, and stage across Lusaka and Tokyo.",
      },
      { property: "og:title", content: "Muyan Collection — Yans Lounge" },
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

function CollectionPage() {
  const { data: tiles = fallbackTiles } = useQuery({
    queryKey: ["public", "collection_items", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_items")
        .select("id, image_url, label")
        .eq("published", true)
        .order("sort_order");
      if (error) throw error;
      return data.length > 0 ? (data as Tile[]) : fallbackTiles;
    },
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const selected = tiles.find((t) => t.id === selectedId && UUID_RE.test(t.id)) ?? null;

  const { open } = useMediaViewer();

  return (
    <PageShell>
      <section className="mx-auto max-w-6xl px-6 py-16 md:px-12">
        <div className="mb-12 max-w-2xl">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.4em] text-white/40">
            Volume 01
          </p>
          <h1 className="font-display text-6xl uppercase leading-none tracking-tight md:text-8xl">
            Muyan Collection
          </h1>
          <p className="mt-6 text-sm text-white/50 md:text-base">
            Eight frames pulled from the quiet places — portrait, broadcast, verse,
            culture, and the stages in between. Tap any card to open it fuller.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {tiles.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() =>
                open({ kind: "image", src: t.image_url, alt: t.label, caption: t.label })
              }
              className="group relative aspect-[3/4] overflow-hidden border border-white/10 bg-neutral-900 text-left"
              aria-label={t.label}
            >
              <img
                src={t.image_url}
                alt={t.label}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-white">
                  {t.label}
                </p>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-16 flex items-center justify-between border-t border-white/10 pt-6 font-mono text-[10px] uppercase tracking-widest text-white/40">
          <span>Muyan · Series 01</span>
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
