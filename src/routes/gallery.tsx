import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/site/SiteChrome";
import { useState } from "react";

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
  const { data: photos = [], isLoading } = useQuery({
    queryKey: ["public", "gallery"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_photos")
        .select("id, image_url, caption, tags")
        .eq("published", true)
        .order("sort_order");
      if (error) throw error;
      return data as Photo[];
    },
  });

  const [active, setActive] = useState<Photo | null>(null);

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
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {photos.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setActive(p)}
                className={`group relative overflow-hidden border border-white/10 bg-neutral-900 ${i % 5 === 0 ? "row-span-2 aspect-[3/4]" : "aspect-square"}`}
              >
                <img
                  src={p.image_url}
                  alt={p.caption ?? ""}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {p.caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-white">{p.caption}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
          onClick={() => setActive(null)}
        >
          <div className="relative max-h-full max-w-5xl">
            <img src={active.image_url} alt={active.caption ?? ""} className="max-h-[85vh] w-auto object-contain" />
            {active.caption && (
              <p className="mt-4 text-center font-mono text-xs uppercase tracking-widest text-white/70">{active.caption}</p>
            )}
            {active.tags?.length > 0 && (
              <p className="mt-2 text-center font-mono text-[10px] text-white/40">{active.tags.map((t) => `#${t}`).join(" · ")}</p>
            )}
          </div>
          <button className="absolute right-6 top-6 font-mono text-xs uppercase tracking-widest text-white/60 hover:text-white">Close ✕</button>
        </div>
      )}
    </PageShell>
  );
}
