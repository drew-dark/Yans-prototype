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
  const { open } = useMediaViewer();
  if (!s) return null;
  const mins = readingTimeMinutes(s.body);
  return (
    <PageShell>
      <ReadingProgress />
      <article className="mx-auto max-w-3xl px-6 py-16 md:px-12">
        <Link to="/stories" className="font-mono text-[10px] uppercase tracking-widest text-white/40 hover:text-white">← Stories</Link>
        <div className="mt-6 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-white/40">
          {s.published_at && (
            <span>{new Date(s.published_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</span>
          )}
          {s.published_at && <span>·</span>}
          <span>{mins} min read</span>
        </div>
        {(s.chapter_number != null || s.chapter_title || s.part_number != null || s.part_title) && (
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
            {s.chapter_number != null && <>Chapter {s.chapter_number}{s.part_number != null ? `.${s.part_number}` : ""}</>}
            {s.chapter_title && <> — {s.chapter_title}</>}
            {s.part_title && <> · {s.part_title}</>}
          </p>
        )}
        <h1 className="mt-3 font-display text-5xl uppercase leading-none tracking-tight md:text-7xl">{s.title}</h1>
        {s.excerpt && (
          <p className="mt-6 border-l-2 border-white/30 pl-4 font-display text-xl italic tracking-tight text-white/70 md:text-2xl">
            {s.excerpt}
          </p>
        )}
        {s.cover_image_url && (
          <button
            type="button"
            onClick={() => open({ kind: "image", src: s.cover_image_url!, alt: s.title })}
            className="group mt-10 block w-full overflow-hidden border border-white/10"
            aria-label="Open cover image"
          >
            <img src={s.cover_image_url} alt="" className="w-full object-cover transition-transform duration-700 group-hover:scale-[1.02] motion-reduce:group-hover:scale-100" />
          </button>
        )}
        {s.body && (
          <Markdown
            text={s.body}
            dropCap
            className="mt-12 font-sans text-lg leading-[1.75] text-white/80 [&_a]:text-white/90"
          />
        )}
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <BookmarkButton contentType="story" contentId={s.id} />
          <StudioEditLink to="/admin/stories" label="Edit story" />
        </div>
        <CommentsSection contentType="story" contentId={s.id} />
        <div className="mt-16 border-t border-white/10 pt-6">
          <Link to="/stories" className="font-mono text-[10px] uppercase tracking-widest text-white/50 hover:text-white">← Back to stories</Link>
        </div>
      </article>
    </PageShell>
  );
}
