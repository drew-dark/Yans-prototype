import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/site/SiteChrome";
import { useMediaViewer } from "@/components/site/MediaViewer";
import { ReadingProgress } from "@/components/site/ReadingProgress";
import { Markdown, readingTimeMinutes } from "@/lib/markdown";
import { BookmarkButton } from "@/components/site/BookmarkButton";
import { StudioEditLink } from "@/components/site/StudioEditLink";
import { CommentsSection } from "@/components/site/CommentsSection";

export const Route = createFileRoute("/collection/dear-today/$slug")({
  head: ({ loaderData }) => {
    const e = loaderData as { title?: string; excerpt?: string | null; cover_url?: string | null } | undefined;
    if (!e) return { meta: [{ title: "Dear Today" }, { name: "robots", content: "noindex" }] };
    const desc = e.excerpt ?? "";
    return {
      meta: [
        { title: `${e.title} — Dear Today` },
        { name: "description", content: desc },
        { property: "og:title", content: `${e.title} — Dear Today` },
        { property: "og:description", content: desc },
        ...(e.cover_url ? [{ property: "og:image", content: e.cover_url }] : []),
      ],
    };
  },
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("dear_today" as never)
      .select("*")
      .eq("slug", params.slug)
      .eq("published", true)
      .maybeSingle();
    if (!data) throw notFound();
    return data as any;
  },
  errorComponent: ({ error }) => (
    <PageShell>
      <div className="mx-auto max-w-2xl p-16 text-center text-white/50">{error.message}</div>
    </PageShell>
  ),
  notFoundComponent: () => (
    <PageShell>
      <div className="mx-auto max-w-2xl px-5 py-16 text-center md:py-24">
        <h1 className="font-display text-6xl uppercase">Not found</h1>
        <Link to="/collection/dear-today" className="mt-6 inline-block font-mono text-xs uppercase tracking-widest text-white/60 hover:text-white">
          ← Back to Dear Today
        </Link>
      </div>
    </PageShell>
  ),
  component: EntryPage,
});

function EntryPage() {
  const params = Route.useParams();
  const { data: e } = useQuery({
    queryKey: ["public", "dear_today", params.slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dear_today" as never)
        .select("*")
        .eq("slug", params.slug)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    initialData: Route.useLoaderData() as any,
  });
  const { open } = useMediaViewer();
  if (!e) return null;
  const mins = readingTimeMinutes(e.body);
  return (
    <PageShell>
      <ReadingProgress />
      <article className="mx-auto max-w-3xl px-5 py-10 md:px-12 md:py-16">
        <Link to="/collection/dear-today" className="font-mono text-[10px] uppercase tracking-widest text-white/40 hover:text-white">
          ← Dear Today
        </Link>
        <div className="mt-6 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-white/40">
          <span>
            {new Date(e.entry_date).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
          </span>
          {mins > 0 && (
            <>
              <span>·</span>
              <span>{mins} min read</span>
            </>
          )}
        </div>
        <h1 className="mt-3 font-display text-5xl uppercase leading-none tracking-tight md:text-7xl">
          {e.title}
        </h1>
        {e.excerpt && (
          <p className="mt-6 border-l-2 border-white/30 pl-4 font-display text-xl italic tracking-tight text-white/70 md:text-2xl">
            {e.excerpt}
          </p>
        )}
        {e.cover_url && (
          <button
            type="button"
            onClick={() => open({ kind: "image", src: e.cover_url!, alt: e.title })}
            className="group mt-10 block w-full overflow-hidden border border-white/10"
          >
            <img
              src={e.cover_url}
              alt=""
              className="w-full object-cover transition-transform duration-700 group-hover:scale-[1.02] motion-reduce:group-hover:scale-100"
            />
          </button>
        )}
        {e.body && (
          <Markdown text={e.body} dropCap className="mt-12 font-sans text-lg leading-[1.75] text-white/80" />
        )}
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <BookmarkButton contentType="dear_today" contentId={e.id} />
          <StudioEditLink to="/admin/dear-today" label="Edit entry" />
        </div>
        <CommentsSection contentType="dear_today" contentId={e.id} />
      </article>
    </PageShell>
  );
}
