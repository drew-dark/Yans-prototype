import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/site/SiteChrome";
import { GridSkeleton } from "@/components/site/GridSkeleton";
import { NewsletterForm } from "@/components/site/NewsletterForm";

export const Route = createFileRoute("/collection")({
  head: () => ({
    meta: [
      { title: "Collections — The Last Mukwasu" },
      {
        name: "description",
        content: "A library of collections — pick one to step inside.",
      },
    ],
  }),
  component: CollectionLibraryPage,
});

type Collection = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_url: string | null;
};

function linkFor(slug: string) {
  // Dear Today keeps its own dedicated pages rather than the generic
  // Collection Home template — see /collection/dear-today.
  return slug === "dear-today" ? "/collection/dear-today" : `/collection/${slug}`;
}

function CollectionLibraryPage() {
  const { t } = useTranslation();
  const { data: collections = [], isLoading } = useQuery({
    queryKey: ["public", "collections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("id, slug, title, description, cover_url")
        .order("sort_order");
      if (error) throw error;
      return data as Collection[];
    },
  });

  return (
    <PageShell>
      <section className="mx-auto max-w-6xl px-5 py-10 md:px-12 md:py-16">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.4em] text-kraft before:block before:h-px before:w-8 before:bg-kraft/60">
            {t("collectionsLibrary.eyebrow")}
          </p>
          <h1 className="font-display text-5xl uppercase leading-none tracking-tight sm:text-6xl md:text-8xl">
            {t("collectionsLibrary.title")}
          </h1>
          <p className="mt-6 text-sm text-white/50 md:text-base">
            {t("collectionsLibrary.intro")}
          </p>
        </div>

        {isLoading ? (
          <GridSkeleton
            count={4}
            className="grid grid-cols-1 gap-6 md:grid-cols-2"
            itemClassName="aspect-[16/9]"
          />
        ) : collections.length === 0 ? (
          <p className="text-white/40">{t("collectionsLibrary.empty")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {collections.map((c) => (
              <Link
                key={c.id}
                to={linkFor(c.slug)}
                className="group surface-card flex flex-col overflow-hidden text-left"
              >
                <div className="aspect-[16/9] overflow-hidden bg-neutral-900">
                  {c.cover_url ? (
                    <img
                      src={c.cover_url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/20">
                      <span className="font-display text-4xl uppercase">{c.title[0]}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <h2 className="font-display text-2xl uppercase leading-tight tracking-tight">
                    {c.title}
                  </h2>
                  {c.description && (
                    <p className="line-clamp-2 text-sm text-white/60">{c.description}</p>
                  )}
                  <span className="mt-auto pt-3 font-mono text-[10px] uppercase tracking-widest text-kraft group-hover:text-white">
                    {t("collectionsLibrary.enter")} →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-20">
          <NewsletterForm source="collection-library" />
        </div>
      </section>
    </PageShell>
  );
}
