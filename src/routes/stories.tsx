import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/site/SiteChrome";
import { Paginator } from "@/components/site/Paginator";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { useEffect, useState } from "react";

const PAGE_SIZE = 6;

export const Route = createFileRoute("/stories")({
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

function StoriesPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["public", "stories", page],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await supabase
        .from("stories")
        .select("id, slug, title, excerpt, cover_image_url, published_at", { count: "exact" })
        .eq("published", true)
        .order("published_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { items: data as Story[], total: count ?? 0 };
    },
  });

  const items = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  return (
    <PageShell>
      <section className="mx-auto max-w-6xl px-6 py-16 md:px-12">
        <div className="mb-16 max-w-2xl">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.4em] text-white/40">The Longer Form</p>
          <h1 className="font-display text-6xl uppercase leading-none tracking-tight md:text-8xl">Stories</h1>
          <p className="mt-6 text-sm text-white/50 md:text-base">
            Essays and reported pieces. Slower than a diary, sharper than a poem.
          </p>
        </div>

        {isLoading ? (
          <p className="text-white/40">Setting the table…</p>
        ) : items.length === 0 ? (
          <p className="text-white/40">No stories published yet.</p>
        ) : (
          <>
            <div className="grid gap-8 md:grid-cols-2">
              {items.map((s) => (
                <Link
                  key={s.id}
                  to="/stories/$slug"
                  params={{ slug: s.slug }}
                  className="group block overflow-hidden border border-white/10 bg-neutral-900/40"
                >
                  {s.cover_image_url && (
                    <div className="aspect-[16/10] overflow-hidden">
                      <img src={s.cover_image_url} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
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
            <Paginator page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}

        <div className="mt-20">
          <NewsletterForm source="stories" />
        </div>
      </section>
    </PageShell>
  );
}
