import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/site/SiteChrome";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { Markdown } from "@/lib/markdown";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — The Last Mukwasu" },
      { name: "description", content: "Zambian poet, author, journalist, and broadcaster. Currently between Lusaka and Tokyo." },
      { property: "og:title", content: "About — The Last Mukwasu" },
      { property: "og:description", content: "Zambian poet, author, journalist, and broadcaster." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { data: about, isLoading } = useQuery({
    queryKey: ["public", "about"],
    queryFn: async () => {
      const { data } = await supabase.from("about_content").select("*").maybeSingle();
      return data;
    },
  });

  return (
    <PageShell>
      <section className="mx-auto max-w-4xl px-5 py-10 md:px-12 md:py-16">
        <div className="mb-12">
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.4em] text-kraft before:block before:h-px before:w-8 before:bg-kraft/60">Colophon</p>
          <h1 className="font-display text-5xl uppercase leading-none tracking-tight sm:text-6xl md:text-8xl">About</h1>
        </div>

        {isLoading ? (
          <p className="text-white/40">Loading…</p>
        ) : (
          <div className="grid gap-10 md:grid-cols-[220px_1fr]">
            {about?.headshot_url ? (
              <div>
                <div
                  className="overflow-hidden border-2 border-kraft"
                  style={{ clipPath: "polygon(0% 3%, 4% 0%, 96% 2%, 100% 6%, 98% 94%, 100% 100%, 4% 98%, 0% 92%)" }}
                >
                  <img src={about.headshot_url} alt={about.headline ?? "Portrait"} className="aspect-[3/4] w-full object-cover" />
                </div>
              </div>
            ) : (
              <div className="hidden md:block" />
            )}

            <div>
              <h2 className="font-display text-3xl uppercase leading-tight tracking-tight md:text-4xl">
                {about?.headline ?? "The Last Mukwasu"}
              </h2>
              {about?.location && (
                <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-white/50">{about.location}</p>
              )}

              {about?.tagline && (
                <p className="mt-6 border-l-2 border-kraft pl-4 text-lg italic text-white/70">{about.tagline}</p>
              )}

              {about?.bio && (
                <Markdown text={about.bio} className="mt-8 text-base leading-relaxed text-white/75" />
              )}

              {about?.socials && Object.keys(about.socials as Record<string, string>).length > 0 && (
                <div className="mt-10 border-t border-white/10 pt-6">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-white/40">Elsewhere</p>
                  <ul className="flex flex-wrap gap-4">
                    {Object.entries(about.socials as Record<string, string>).map(([name, url]) => (
                      <li key={name}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs uppercase tracking-widest text-white/70 underline-offset-4 hover:text-white hover:underline"
                        >
                          {name} →
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-20">
          <NewsletterForm source="about" />
        </div>
      </section>
    </PageShell>
  );
}

