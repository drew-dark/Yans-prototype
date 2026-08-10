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

export const Route = createFileRoute("/diaries")({
  validateSearch: validatePageSearch,
  head: () => ({
    meta: [
      { title: "Gaijin Diaries — The Last Mukwasu" },
      { name: "description", content: "Field notes from a Zambian abroad — dispatches on distance, language, and small kindnesses." },
      { property: "og:title", content: "Gaijin Diaries — The Last Mukwasu" },
      { property: "og:description", content: "Field notes from a Zambian abroad." },
    ],
  }),
  component: DiariesPage,
});

type Entry = { id: string; slug: string; title: string; entry_date: string; location: string | null; cover_image_url: string | null; body: string | null };

const diariesQuery = (page: number) => ({
  queryKey: ["public", "diaries", page] as const,
  queryFn: async () => {
    const { from, to } = pageRangeBounds(page, PAGE_SIZE);
    const { data, error, count } = await supabase
      .from("diary_entries")
      .select("id, slug, title, entry_date, location, cover_image_url, body", { count: "exact" })
      .eq("published", true)
      .order("entry_date", { ascending: false })
      .range(from, to);
    if (error && !isRangeOutOfBounds(error)) throw error;
    return { entries: (data ?? []) as Entry[], total: count ?? 0 };
  },
});

function DiariesPage() {
  const { page } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const qc = useQueryClient();
  const setPage = (p: number) => navigate({ search: { page: p } });

  const { data, isLoading, isFetching } = useQuery({
    ...diariesQuery(page),
    placeholderData: keepPreviousData,
  });

  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;
  const totalPages = totalPagesFor(total, PAGE_SIZE);

  useScrollTopOnPageChange(page);

  useEffect(() => {
    if (page < totalPages) qc.prefetchQuery(diariesQuery(page + 1));
  }, [page, totalPages, qc]);

  useEffect(() => {
    if (data && page > totalPages) setPage(totalPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, page, totalPages]);

  return (
    <PageShell>
      <section className="mx-auto max-w-4xl px-5 py-10 md:px-12 md:py-16">
        <div className="mb-16 max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.4em] text-kraft before:block before:h-px before:w-8 before:bg-kraft/60">Field Notebook</p>
          <h1 className="font-display text-5xl uppercase leading-none tracking-tight sm:text-6xl md:text-8xl">Gaijin<br />Diaries</h1>
          <p className="mt-6 text-sm text-white/50 md:text-base">
            Entries kept between Lusaka and Tokyo. Half journalism, half apology.
          </p>
        </div>

        {isLoading ? (
          <GridSkeleton count={3} className="space-y-12" itemClassName="h-44" />
        ) : entries.length === 0 ? (
          <p className="text-white/40">No entries yet.</p>
        ) : (
          <>
            <div
              className={`space-y-12 transition-opacity duration-200 motion-reduce:transition-none ${isFetching ? "opacity-50" : "opacity-100"}`}
            >
              {entries.map((e) => (
                <article key={e.id} className="border-b border-white/10 pb-12 last:border-b-0">
                  <Link
                    to="/diaries/$slug"
                    params={{ slug: e.slug }}
                    className="group grid gap-6 md:grid-cols-[200px_1fr]"
                  >
                    {e.cover_image_url && (
                      <div className="overflow-hidden bg-neutral-900">
                        <img src={e.cover_image_url} alt="" loading="lazy" className="h-40 w-full object-cover md:h-full" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-white/40">
                        <span>{new Date(e.entry_date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>
                        {e.location && <><span>·</span><span>{e.location}</span></>}
                      </div>
                      <h2 className="mt-3 font-display text-3xl uppercase leading-tight tracking-tight group-hover:text-white/70 md:text-4xl">
                        {e.title}
                      </h2>
                      {e.body && (
                        <p className="mt-3 line-clamp-3 text-sm text-white/50">{e.body.slice(0, 240)}…</p>
                      )}
                      <span className="mt-4 inline-block font-mono text-[10px] uppercase tracking-widest text-white/60">Read entry →</span>
                    </div>
                  </Link>
                </article>
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

        <div className="mt-20">
          <NewsletterForm source="diaries" />
        </div>
      </section>
    </PageShell>
  );
}
