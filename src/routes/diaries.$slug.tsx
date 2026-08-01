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

export const Route = createFileRoute("/diaries/$slug")({
  head: ({ loaderData }) => {
    const e = loaderData as { title?: string; body?: string | null; cover_image_url?: string | null } | undefined;
    if (!e) return { meta: [{ title: "Entry — Gaijin Diaries" }, { name: "robots", content: "noindex" }] };
    return {
      meta: [
        { title: `${e.title} — Gaijin Diaries` },
        { name: "description", content: e.body?.slice(0, 160) ?? "Diary entry" },
        { property: "og:title", content: `${e.title} — Gaijin Diaries` },
        { property: "og:description", content: e.body?.slice(0, 160) ?? "Diary entry" },
        ...(e.cover_image_url ? [{ property: "og:image", content: e.cover_image_url }] : []),
      ],
    };
  },
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("diary_entries")
      .select("*")
      .eq("slug", params.slug)
      .eq("published", true)
      .maybeSingle();
    if (!data) throw notFound();
    return data;
  },
  errorComponent: ({ error }) => (
    <PageShell><div className="mx-auto max-w-2xl p-16 text-center text-white/50">{error.message}</div></PageShell>
  ),
  notFoundComponent: () => (
    <PageShell>
      <div className="mx-auto max-w-2xl px-5 py-16 text-center md:py-24">
        <h1 className="font-display text-6xl uppercase">Not found</h1>
        <p className="mt-4 text-white/50">That entry isn't published.</p>
        <Link to="/diaries" className="mt-6 inline-block font-mono text-xs uppercase tracking-widest text-white/60 hover:text-white">← Back to diaries</Link>
      </div>
    </PageShell>
  ),
  component: EntryPage,
});

function EntryPage() {
  const params = Route.useParams();
  const { data: e } = useQuery({
    queryKey: ["public", "diary", params.slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("diary_entries").select("*").eq("slug", params.slug).eq("published", true).maybeSingle();
      if (error) throw error;
      return data;
    },
    initialData: Route.useLoaderData(),
  });
  const { open } = useMediaViewer();
  if (!e) return null;
  const mins = readingTimeMinutes(e.body);
  return (
    <PageShell>
      <ReadingProgress />
      <article className="mx-auto max-w-3xl px-5 py-10 md:px-12 md:py-16">
        <Link to="/diaries" className="font-mono text-[10px] uppercase tracking-widest text-white/40 hover:text-white">← Diaries</Link>
        <div className="mt-6 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-white/40">
          <span>{new Date(e.entry_date).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</span>
          {e.location && <><span>·</span><span>{e.location}</span></>}
          {mins > 0 && <><span>·</span><span>{mins} min read</span></>}
        </div>
        {(e.chapter_number != null || e.chapter_title || e.part_number != null || e.part_title) && (
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
            {e.chapter_number != null && <>Chapter {e.chapter_number}{e.part_number != null ? `.${e.part_number}` : ""}</>}
            {e.chapter_title && <> — {e.chapter_title}</>}
            {e.part_title && <> · {e.part_title}</>}
          </p>
        )}
        <h1 className="mt-3 font-display text-4xl uppercase leading-tight tracking-tight sm:text-5xl md:text-7xl">{e.title}</h1>
        {e.cover_image_url && (
          <button
            type="button"
            onClick={() => open({ kind: "image", src: e.cover_image_url!, alt: e.title })}
            className="group mt-10 block w-full overflow-hidden border border-white/10"
            aria-label="Open cover image"
          >
            <img src={e.cover_image_url} alt="" className="w-full object-cover transition-transform duration-700 group-hover:scale-[1.02] motion-reduce:group-hover:scale-100" />
          </button>
        )}
        {e.body && (
          <Markdown
            text={e.body}
            dropCap
            className="mt-12 font-sans text-lg leading-[1.75] text-white/80"
          />
        )}
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <BookmarkButton contentType="diary" contentId={e.id} />
          <StudioEditLink to="/admin/diary" label="Edit entry" />
        </div>
        <CommentsSection contentType="diary" contentId={e.id} />
        <div className="mt-16 border-t border-white/10 pt-6">
          <Link to="/diaries" className="font-mono text-[10px] uppercase tracking-widest text-white/50 hover:text-white">← Back to diaries</Link>
        </div>
      </article>
    </PageShell>
  );
}
