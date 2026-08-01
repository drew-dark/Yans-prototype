import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/site/SiteChrome";
import { Paginator } from "@/components/site/Paginator";
import { GridSkeleton } from "@/components/site/GridSkeleton";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { isRangeOutOfBounds, pageRangeBounds, totalPagesFor, useScrollTopOnPageChange, validatePageSearch } from "@/lib/pagination";
import { useEffect } from "react";

const PAGE_SIZE = 6;

export const Route = createFileRoute("/stories")({
  validateSearch: validatePageSearch,
  head: () => ({
    meta: [
      { title: "Stories — Emmanuel Rayan Daka" },
      { name: "description", content: "Long-form stories, essays, and reportage." },
      { property: "og:title", content: "Stories — Yans Lounge" },
      { property: "og:description", content: "Long-form stories, essays, and reportage." },
    ],
  }),
  component: StoriesPage,
});

type Story = { id: string; slug: string; title: string; excerpt: string | null; cover_image_url: string | null; published_at: string | null };

const storiesQuery = (page: number) => ({
  queryKey: ["public", "stories", page] as const,
  queryFn: async () => {
    const { from, to } = pageRangeBounds(page, PAGE_SIZE);
    const { data, error, count } = await supabase
      .from("stories")
      .select("id, slug, title, excerpt, cover_image_url, published_at", { count: "exact" })
      .eq("published", true)
      .order("published_at", { ascending: false })
      .range(from, to);
    if (error && !isRangeOutOfBounds(error)) throw error;
    return { items: (data ?? []) as Story[], total: count ?? 0 };
  },
});

function StoriesPage() {
  const { page } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const qc = useQueryClient();
  const setPage = (p: number) => navigate({ search: { page: p } });

  const { data, isLoading, isFetching } = useQuery({
    ...storiesQuery(page),
    placeholderData: keepPreviousData,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = totalPagesFor(total, PAGE_SIZE);

  useScrollTopOnPageChange(page);

  useEffect(() => {
    if (page < totalPages) qc.prefetchQuery(storiesQuery(page + 1));
  }, [page, totalPages, qc]);

  useEffect(() => {
    if (data && page > totalPages) setPage(totalPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, page, totalPages]);

  return (
    <PageShell>
      <section className="mx-auto max-w-6xl px-5 py-10 md:px-12 md:py-16">
        <div className="mb-16 max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.4em] text-kraft before:block before:h-px before:w-8 before:bg-kraft/60">The Longer Form</p>
          <h1 className="font-display text-6xl uppercase leading-none tracking-tight md:text-8xl">Stories</h1>
          <p className="mt-6 text-sm text-white/50 md:text-base">
            Essays and reported pieces. Slower than a diary, sharper than a poem.
          </p>
        </div>

        {isLoading ? (
          <GridSkeleton count={PAGE_SIZE} className="grid gap-8 md:grid-cols-2" itemClassName="h-72" />
        ) : items.length === 0 ? (
          <p className="text-white/40">No stories published yet.</p>
        ) : (
          <>
            <div
              className={`grid gap-8 transition-opacity duration-200 motion-reduce:transition-none md:grid-cols-2 ${isFetching ? "opacity-50" : "opacity-100"}`}
            >
              {items.map((s) => (
                <Link
                  key={s.id}
                  to="/stories/$slug"
                  params={{ slug: s.slug }}
                  className="group block overflow-hidden border border-white/10 bg-neutral-900/40 transition-colors duration-300 hover:border-kraft/40"
                >
                  {s.cover_image_url && (
                    <div className="aspect-[16/10] overflow-hidden">
                      <img src={s.cover_image_url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
                    </div>
                  )}
                  <div className="p-6">
                    {s.published_at && (
                      <p className="font-mono text-[9px] uppercase tracking-widest text-white/40">
                        {new Date(s.published_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    )}
                    <h2 className="mt-2 font-display text-3xl uppercase leading-tight tracking-tight group-hover:text-white/70">{s.title}</h2>
                    {s.excerpt && <p className="mt-3 text-sm text-white/50 line-clamp-3">{s.excerpt}</p>}
                    <span className="mt-4 inline-block font-mono text-[10px] uppercase tracking-widest text-white/60">Read →</span>
                  </div>
                </Link>
              ))}
            </div>
            <Paginator
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              total={total}
              pageSize={PAGE_SIZE}
              currentCount={items.length}
            />
          </>
        )}

        <div className="mt-20">
          <NewsletterForm source="stories" />
        </div>
      </section>
    </PageShell>
  );
}
