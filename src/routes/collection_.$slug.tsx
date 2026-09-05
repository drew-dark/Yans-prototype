import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/site/SiteChrome";
import { GridSkeleton } from "@/components/site/GridSkeleton";

export const Route = createFileRoute("/collection_/$slug")({
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
    return data;
  },
  notFoundComponent: () => (
    <PageShell>
      <div className="mx-auto max-w-2xl px-5 py-16 text-center md:py-24">
        <h1 className="font-display text-6xl uppercase">Not found</h1>
        <Link
          to="/collection"
          className="mt-6 inline-block font-mono text-xs uppercase tracking-widest text-white/60 hover:text-white"
        >
          ← Back to Collections
        </Link>
      </div>
    </PageShell>
  ),
  component: CollectionHomePage,
});

type CollectionRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_url: string | null;
};

type Entry = {
  id: string;
  slug: string;
  title: string;
  cover_url: string | null;
  entry_date: string;
};

function CollectionHomePage() {
  const { t } = useTranslation();
  const params = Route.useParams();
  const loaderData = Route.useLoaderData() as CollectionRow;

  const { data: collection } = useQuery({
    queryKey: ["public", "collection", params.slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("slug", params.slug)
        .maybeSingle();
      if (error) throw error;
      return data as CollectionRow | null;
    },
    initialData: loaderData,
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["public", "collection-entries", collection?.id],
    enabled: !!collection?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_entries")
        .select("id, slug, title, cover_url, entry_date")
        .eq("collection_id", collection!.id)
        .eq("published", true)
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return data as Entry[];
    },
  });

  if (!collection) return null;

  return (
    <PageShell>
      <section className="mx-auto max-w-6xl px-5 py-10 md:px-12 md:py-16">
        <Link
          to="/collection"
          className="font-mono text-[10px] uppercase tracking-widest text-white/40 hover:text-white"
        >
          ← {t("collectionHome.backToLibrary")}
        </Link>

        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.35em] text-kraft">
          {t("collectionHome.eyebrow")}
        </p>
        <h1 className="mt-2 font-display text-4xl uppercase leading-tight tracking-tight sm:text-5xl md:text-6xl">
          {collection.title}
        </h1>
        {collection.description && (
          <p className="mt-4 max-w-2xl text-white/60">{collection.description}</p>
        )}

        <div className="mt-12">
          {isLoading ? (
            <GridSkeleton
              count={6}
              className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
              itemClassName="aspect-[4/3]"
            />
          ) : entries.length === 0 ? (
            <p className="text-white/40">{t("collectionHome.empty")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {entries.map((entry) => (
                <Link
                  key={entry.id}
                  to="/collection/$slug/$entrySlug"
                  params={{ slug: collection.slug, entrySlug: entry.slug }}
                  className="group surface-card flex flex-col overflow-hidden text-left"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-neutral-900">
                    {entry.cover_url ? (
                      <img
                        src={entry.cover_url}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-white/15">
                        <span className="font-display text-3xl uppercase">{entry.title[0]}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5 p-4">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                      {new Date(entry.entry_date).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    <h3 className="font-display text-lg uppercase leading-tight tracking-tight">
                      {entry.title}
                    </h3>
                    <span className="mt-auto pt-2 font-mono text-[10px] uppercase tracking-widest text-kraft group-hover:text-white">
                      {t("collectionHome.readNow")} →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
