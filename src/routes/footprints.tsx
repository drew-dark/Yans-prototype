import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/site/SiteChrome";
import { GridSkeleton } from "@/components/site/GridSkeleton";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { useMediaViewer } from "@/components/site/MediaViewer";
import { getEmbedThumbnail, isPlayable } from "@/lib/media";
import { BookmarkButton } from "@/components/site/BookmarkButton";
import { ReactionBar } from "@/components/site/Reactions";

export const Route = createFileRoute("/footprints")({
  head: () => ({
    meta: [
      { title: "Footprints — The Last Mukwasu" },
      {
        name: "description",
        content: "Past work — news appearances, creator videos, and other projects.",
      },
      { property: "og:title", content: "Footprints — The Last Mukwasu" },
    ],
  }),
  component: FootprintsPage,
});

type Footprint = {
  id: string;
  title: string;
  category: string;
  role_or_outlet: string | null;
  description: string | null;
  occurred_on: string | null;
  media_url: string | null;
  external_url: string | null;
  cover_url: string | null;
  tags: string[];
};

function FootprintsPage() {
  const { t } = useTranslation();
  const { open } = useMediaViewer();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["public", "footprints"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("footprints")
        .select(
          "id, title, category, role_or_outlet, description, occurred_on, media_url, external_url, cover_url, tags",
        )
        .eq("published", true)
        .order("sort_order");
      if (error) throw error;
      return data as Footprint[];
    },
  });

  return (
    <PageShell>
      <section className="mx-auto max-w-6xl px-5 py-10 md:px-12 md:py-16">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.4em] text-kraft before:block before:h-px before:w-8 before:bg-kraft/60">
            {t("footprints.eyebrow")}
          </p>
          <h1 className="font-display text-5xl uppercase leading-none tracking-tight sm:text-6xl md:text-8xl">
            {t("footprints.title")}
          </h1>
          <p className="mt-6 text-sm text-white/50 md:text-base">{t("footprints.intro")}</p>
        </div>

        {isLoading ? (
          <GridSkeleton
            count={6}
            className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
            itemClassName="aspect-[4/3]"
          />
        ) : items.length === 0 ? (
          <p className="text-white/40">{t("footprints.empty")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const thumb =
                item.cover_url || (item.media_url ? getEmbedThumbnail(item.media_url) : null);
              const playable = item.media_url ? isPlayable(item.media_url) : false;

              return (
                <article
                  key={item.id}
                  className="group surface-card flex flex-col overflow-hidden"
                >
                  {(thumb || item.media_url) && (
                    <button
                      type="button"
                      className="relative aspect-[4/3] w-full overflow-hidden bg-black/40"
                      onClick={() => {
                        if (!item.media_url) return;
                        open(
                          playable
                            ? { kind: "video", src: item.media_url, caption: item.title }
                            : { kind: "image", src: item.media_url, alt: item.title },
                        );
                      }}
                    >
                      <img
                        src={thumb ?? item.media_url ?? ""}
                        alt={item.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                      />
                      {playable && (
                        <span className="pointer-events-none absolute right-2 top-2 rounded bg-black/70 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-white/80">
                          ▶ {t("common.video")}
                        </span>
                      )}
                    </button>
                  )}

                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-kraft">
                      <span>{item.category}</span>
                      {item.occurred_on && (
                        <>
                          <span className="text-white/20">·</span>
                          <span className="text-white/40">{item.occurred_on}</span>
                        </>
                      )}
                    </div>
                    <h2 className="font-display text-lg uppercase leading-tight">{item.title}</h2>
                    {item.role_or_outlet && (
                      <p className="text-xs text-white/50">{item.role_or_outlet}</p>
                    )}
                    {item.description && (
                      <p className="line-clamp-3 text-sm text-white/60">{item.description}</p>
                    )}
                    {item.external_url && (
                      <a
                        href={item.external_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs uppercase tracking-widest text-kraft hover:text-white"
                      >
                        {t("footprints.viewLink")} →
                      </a>
                    )}
                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                      <BookmarkButton contentType="footprint" contentId={item.id} />
                      <ReactionBar contentType="footprint" contentId={item.id} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-20">
          <NewsletterForm source="footprints" />
        </div>
      </section>
    </PageShell>
  );
}
