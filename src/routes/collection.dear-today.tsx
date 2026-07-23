import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/site/SiteChrome";
import { NewsletterForm } from "@/components/site/NewsletterForm";

export const Route = createFileRoute("/collection/dear-today")({
  head: () => ({
    meta: [
      { title: "Dear Today — Yans Lounge" },
      { name: "description", content: "Dear Today — dated snippets, small notes, and quiet observations." },
      { property: "og:title", content: "Dear Today — Yans Lounge" },
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

function DearTodayList() {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["public", "dear_today", "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dear_today" as never)
        .select("id, entry_date, title, slug, excerpt, cover_url")
        .eq("published", true)
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Entry[];
    },
  });

  return (
    <PageShell>
      <section className="mx-auto max-w-4xl px-6 py-16 md:px-12">
        <div className="mb-12 max-w-2xl">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.4em] text-white/40">
            A collection
          </p>
          <h1 className="font-display text-6xl uppercase leading-none tracking-tight md:text-8xl">
            Dear Today
          </h1>
          <p className="mt-6 text-sm text-white/50 md:text-base">
            Small notes and quiet observations, dated as they arrive.
          </p>
        </div>

        {isLoading ? (
          <p className="text-white/40">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-white/40">No entries yet.</p>
        ) : (
          <div className="space-y-4">
            {entries.map((e) => (
              <Link
                key={e.id}
                to="/collection/dear-today/$slug"
                params={{ slug: e.slug }}
                className="group flex gap-4 rounded border border-white/10 bg-neutral-900/40 p-4 transition-colors hover:border-white/40"
              >
                {e.cover_url && (
                  <img src={e.cover_url} alt="" className="h-20 w-20 rounded object-cover md:h-24 md:w-24" />
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
        )}

        <div className="mt-16">
          <NewsletterForm source="dear-today" />
        </div>
      </section>
    </PageShell>
  );
}
