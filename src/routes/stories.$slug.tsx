import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/site/SiteChrome";

export const Route = createFileRoute("/stories/$slug")({
  head: ({ loaderData }) => {
    const s = loaderData as { title?: string; excerpt?: string | null; cover_image_url?: string | null } | undefined;
    if (!s) return { meta: [{ title: "Story" }, { name: "robots", content: "noindex" }] };
    const desc = s.excerpt ?? "";
    return {
      meta: [
        { title: `${s.title} — Stories` },
        { name: "description", content: desc },
        { property: "og:title", content: `${s.title} — Stories` },
        { property: "og:description", content: desc },
        ...(s.cover_image_url ? [{ property: "og:image", content: s.cover_image_url }] : []),
      ],
    };
  },
  loader: async ({ params }) => {
    const { data } = await supabase.from("stories").select("*").eq("slug", params.slug).eq("published", true).maybeSingle();
    if (!data) throw notFound();
    return data;
  },
  errorComponent: ({ error }) => (
    <PageShell><div className="mx-auto max-w-2xl p-16 text-center text-white/50">{error.message}</div></PageShell>
  ),
  notFoundComponent: () => (
    <PageShell>
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-display text-6xl uppercase">Not found</h1>
        <Link to="/stories" className="mt-6 inline-block font-mono text-xs uppercase tracking-widest text-white/60 hover:text-white">← Back to stories</Link>
      </div>
    </PageShell>
  ),
  component: StoryPage,
});

function StoryPage() {
  const params = Route.useParams();
  const { data: s } = useQuery({
    queryKey: ["public", "story", params.slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("stories").select("*").eq("slug", params.slug).eq("published", true).maybeSingle();
      if (error) throw error;
      return data;
    },
    initialData: Route.useLoaderData(),
  });
  if (!s) return null;
  return (
    <PageShell>
      <article className="mx-auto max-w-3xl px-6 py-16 md:px-12">
        <Link to="/stories" className="font-mono text-[10px] uppercase tracking-widest text-white/40 hover:text-white">← Stories</Link>
        {s.published_at && (
          <p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-white/40">
            {new Date(s.published_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}
        <h1 className="mt-3 font-display text-5xl uppercase leading-none tracking-tight md:text-7xl">{s.title}</h1>
        {s.excerpt && <p className="mt-6 text-lg text-white/60">{s.excerpt}</p>}
        {s.cover_image_url && (
          <img src={s.cover_image_url} alt="" className="mt-10 w-full border border-white/10 object-cover" />
        )}
        {s.body && (
          <div className="mt-10 whitespace-pre-wrap font-sans text-base leading-relaxed text-white/80">
            {s.body}
          </div>
        )}
      </article>
    </PageShell>
  );
}
