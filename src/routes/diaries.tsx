import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/site/SiteChrome";

export const Route = createFileRoute("/diaries")({
  head: () => ({
    meta: [
      { title: "Gaijin Diaries — Emmanuel Rayan Daka" },
      { name: "description", content: "Field notes from a Zambian abroad — dispatches on distance, language, and small kindnesses." },
      { property: "og:title", content: "Gaijin Diaries" },
      { property: "og:description", content: "Field notes from a Zambian abroad." },
    ],
  }),
  component: DiariesPage,
});

type Entry = { id: string; slug: string; title: string; entry_date: string; location: string | null; cover_image_url: string | null; body: string | null };

function DiariesPage() {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["public", "diaries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diary_entries")
        .select("id, slug, title, entry_date, location, cover_image_url, body")
        .eq("published", true)
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return data as Entry[];
    },
  });

  return (
    <PageShell>
      <section className="mx-auto max-w-4xl px-6 py-16 md:px-12">
        <div className="mb-16 max-w-2xl">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.4em] text-white/40">Field Notebook</p>
          <h1 className="font-display text-6xl uppercase leading-none tracking-tight md:text-8xl">Gaijin<br />Diaries</h1>
          <p className="mt-6 text-sm text-white/50 md:text-base">
            Entries kept between Lusaka and Tokyo. Half journalism, half apology.
          </p>
        </div>

        {isLoading ? (
          <p className="text-white/40">Opening the notebook…</p>
        ) : entries.length === 0 ? (
          <p className="text-white/40">No entries yet.</p>
        ) : (
          <div className="space-y-12">
            {entries.map((e) => (
              <article key={e.id} className="border-b border-white/10 pb-12 last:border-b-0">
                <Link
                  to="/diaries/$slug"
                  params={{ slug: e.slug }}
                  className="group grid gap-6 md:grid-cols-[200px_1fr]"
                >
                  {e.cover_image_url && (
                    <div className="overflow-hidden bg-neutral-900">
                      <img src={e.cover_image_url} alt="" className="h-40 w-full object-cover md:h-full" />
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
        )}
      </section>
    </PageShell>
  );
}
