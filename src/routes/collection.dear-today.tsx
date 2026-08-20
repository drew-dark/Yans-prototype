import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/site/SiteChrome";
import { Paginator } from "@/components/site/Paginator";
import { GridSkeleton } from "@/components/site/GridSkeleton";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { isRangeOutOfBounds, pageRangeBounds, totalPagesFor, useScrollTopOnPageChange, validatePageSearch } from "@/lib/pagination";

const PAGE_SIZE = 10;

export const Route = createFileRoute("/collection/dear-today")({
  validateSearch: validatePageSearch,
  head: () => ({
    meta: [
      { title: "Dear Today — The Last Mukwasu" },
      { name: "description", content: "Dear Today — dated snippets, small notes, and quiet observations." },
      { property: "og:title", content: "Dear Today — The Last Mukwasu" },
      { property: "og:description", content: "Dated snippets, small notes, and quiet observations." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: DearTodayList,
});

type Entry = {
  id: string;
  entry_date: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_url: string | null;
};

const dearTodayQuery = (page: number) => ({
  queryKey: ["public", "dear_today", page] as const,
  queryFn: async () => {
    const { from, to } = pageRangeBounds(page, PAGE_SIZE);
    const { data, error, count } = await supabase
      .from("dear_today")
      .select("id, entry_date, title, slug, excerpt, cover_url", { count: "exact" })
      .eq("published", true)
      .order("entry_date", { ascending: false })
      .range(from, to);
    if (error && !isRangeOutOfBounds(error)) throw error;
    return { entries: (data ?? []) as unknown as Entry[], total: count ?? 0 };
  },
});

function DearTodayList() {
  const { page } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const qc = useQueryClient();
  const setPage = (p: number) => navigate({ search: { page: p } });

  const { data, isLoading, isFetching } = useQuery({
    ...dearTodayQuery(page),
    placeholderData: keepPreviousData,
  });

  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;
  const totalPages = totalPagesFor(total, PAGE_SIZE);

  useScrollTopOnPageChange(page);

  useEffect(() => {
    if (page < totalPages) qc.prefetchQuery(dearTodayQuery(page + 1));
  }, [page, totalPages, qc]);

  useEffect(() => {
    if (data && page > totalPages) setPage(totalPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, page, totalPages]);

  return (
    <PageShell>
      <section className="mx-auto max-w-4xl px-5 py-10 md:px-12 md:py-16">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.4em] text-kraft before:block before:h-px before:w-8 before:bg-kraft/60">
            A collection
          </p>
          <h1 className="font-display text-5xl uppercase leading-none tracking-tight sm:text-6xl md:text-8xl">
            Dear Today
          </h1>
          <p className="mt-6 text-sm text-white/50 md:text-base">
            Small notes and quiet observations, dated as they arrive.
          </p>
        </div>

        {isLoading ? (
          <GridSkeleton count={5} className="space-y-4" itemClassName="h-28 rounded" />
        ) : entries.length === 0 ? (
          <p className="text-white/40">No entries yet.</p>
        ) : (
          <>
            <div
              className={`space-y-4 transition-opacity duration-200 motion-reduce:transition-none ${isFetching ? "opacity-50" : "opacity-100"}`}
            >
              {entries.map((e) => (
                <Link
                  key={e.id}
                  to="/collection/dear-today/$slug"
                  params={{ slug: e.slug }}
                  className="group flex gap-4 rounded border border-white/10 bg-neutral-900/40 transition-colors duration-300 hover:border-kraft/40 p-4 transition-colors hover:border-white/40"
                >
                  {e.cover_url && (
                    <img src={e.cover_url} alt="" loading="lazy" className="h-20 w-20 rounded object-cover md:h-24 md:w-24" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                      {new Date(e.entry_date).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <h2 className="mt-1 font-display text-xl uppercase leading-tight md:text-2xl">
                      {e.title}
                    </h2>
                    {e.excerpt && (
                      <p className="mt-2 line-clamp-2 text-sm text-white/60">{e.excerpt}</p>
                    )}
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
              currentCount={entries.length}
            />
          </>
        )}

        <div className="mt-16">
          <NewsletterForm source="dear-today" />
        </div>
      </section>
    </PageShell>
  );
}
