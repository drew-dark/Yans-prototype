import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/site/SiteChrome";
import { Paginator } from "@/components/site/Paginator";
import { GridSkeleton } from "@/components/site/GridSkeleton";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { ContentCard } from "@/components/site/ContentCard";
import { ReactionSummary } from "@/components/site/Reactions";
import { isRangeOutOfBounds, pageRangeBounds, totalPagesFor, useScrollTopOnPageChange, validatePageSearch } from "@/lib/pagination";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const PAGE_SIZE = 6;

export const Route = createFileRoute("/stories")({
  validateSearch: validatePageSearch,
  head: () => ({
    meta: [
      { title: "Stories — The Last Mukwasu" },
      { name: "description", content: "Long-form stories, essays, and reportage." },
      { property: "og:title", content: "Stories — The Last Mukwasu" },
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
  const { t } = useTranslation();
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
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.4em] text-kraft before:block before:h-px before:w-8 before:bg-kraft/60">{t("stories.eyebrow")}</p>
          <h1 className="font-display text-5xl uppercase leading-none tracking-tight sm:text-6xl md:text-8xl">{t("stories.title")}</h1>
          <p className="mt-6 text-sm text-white/50 md:text-base">
            {t("stories.intro")}
          </p>
        </div>

        {isLoading ? (
          <GridSkeleton count={PAGE_SIZE} className="grid gap-8 md:grid-cols-2" itemClassName="h-72" />
        ) : items.length === 0 ? (
          <p className="text-white/40">{t("stories.empty")}</p>
        ) : (
          <>
            <div
              className={`grid gap-8 transition-opacity duration-200 motion-reduce:transition-none md:grid-cols-2 ${isFetching ? "opacity-50" : "opacity-100"}`}
            >
              {items.map((s) => (
                <ContentCard
                  key={s.id}
                  to={{ to: "/stories/$slug", params: { slug: s.slug } }}
                  image={s.cover_image_url}
                  aspect="video"
                  eyebrow={
                    s.published_at
                      ? new Date(s.published_at).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : undefined
                  }
                  title={s.title}
                  excerpt={s.excerpt}
                  footer={
                    <>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-white/60">
                        {t("stories.read")} →
                      </span>
                      <ReactionSummary contentType="story" contentId={s.id} />
                    </>
                  }
                />
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
