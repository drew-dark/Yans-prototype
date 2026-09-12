import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/site/SiteChrome";
import { BookmarkButton } from "@/components/site/BookmarkButton";
import { ReactionBar } from "@/components/site/Reactions";
import { CommentsSection } from "@/components/site/CommentsSection";
import { StudioEditLink } from "@/components/site/StudioEditLink";
import { useMediaViewer } from "@/components/site/MediaViewer";
import { getEmbedThumbnail, isPlayable } from "@/lib/media";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/footprints_/$slug")({
  head: ({ loaderData }) => {
    const f = loaderData as { title?: string } | undefined;
    return {
      meta: f?.title
        ? [{ title: `${f.title} — Footprints` }]
        : [{ title: "Footprints" }, { name: "robots", content: "noindex" }],
    };
  },
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("footprints")
      .select("*")
      .eq("slug", params.slug)
      .eq("published", true)
      .maybeSingle();
    if (!data) throw notFound();
    return data;
  },
  notFoundComponent: () => (
    <PageShell>
      <div className="mx-auto max-w-2xl px-5 py-16 text-center md:py-24">
        <h1 className="font-display text-6xl uppercase">Not found</h1>
        <Link
          to="/footprints"
          className="mt-6 inline-block font-mono text-xs uppercase tracking-widest text-white/60 hover:text-white"
        >
          ← Back to Footprints
        </Link>
      </div>
    </PageShell>
  ),
  component: FootprintDetailPage,
});

function FootprintDetailPage() {
  const { t } = useTranslation();
  const params = Route.useParams();
  const loaderData = Route.useLoaderData();
  const { open } = useMediaViewer();

  const { data: item } = useQuery({
    queryKey: ["public", "footprint", params.slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("footprints")
        .select("*")
        .eq("slug", params.slug)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    initialData: loaderData,
  });

  if (!item) return null;

  const thumb = item.cover_url || (item.media_url ? getEmbedThumbnail(item.media_url) : null);
  const playable = item.media_url ? isPlayable(item.media_url) : false;
  const pdfOrAttachment = item.media_url && !thumb && !playable ? item.media_url : null;

  return (
    <PageShell>
      <article className="mx-auto max-w-2xl px-5 py-10 md:px-12 md:py-16">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-white/40">
          <Link to="/footprints" className="hover:text-white">
            {t("footprints.title")}
          </Link>
          <span>/</span>
          <span className="text-white/70">{item.title}</span>
        </nav>

        <div className="mt-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-kraft">
          <span>{item.category}</span>
          {item.occurred_on && (
            <>
              <span className="text-white/20">·</span>
              <span className="text-white/40">{item.occurred_on}</span>
            </>
          )}
        </div>
        <h1 className="mt-2 font-display text-4xl uppercase leading-tight tracking-tight sm:text-5xl md:text-6xl">
          {item.title}
        </h1>
        {item.role_or_outlet && <p className="mt-2 text-sm text-white/50">{item.role_or_outlet}</p>}

        {(thumb || item.media_url) && (
          <button
            type="button"
            onClick={() => {
              if (!item.media_url) return;
              open(
                playable
                  ? { kind: "video", src: item.media_url, caption: item.title }
                  : { kind: "image", src: thumb ?? item.media_url, alt: item.title },
              );
            }}
            className="mt-8 block aspect-video w-full overflow-hidden bg-neutral-900"
          >
            <img src={thumb ?? item.media_url ?? ""} alt="" className="h-full w-full object-cover" />
          </button>
        )}

        {pdfOrAttachment && (
          <a
            href={pdfOrAttachment}
            target="_blank"
            rel="noreferrer"
            className="mt-8 flex items-center gap-2 border border-white/10 px-4 py-3 text-sm text-white/70 hover:border-kraft hover:text-white"
          >
            <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t("footprints.viewLink")}
          </a>
        )}

        {item.description && (
          <p className="mt-8 whitespace-pre-line text-lg leading-relaxed text-white/80">
            {item.description}
          </p>
        )}

        {item.external_url && (
          <a
            href={item.external_url}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-block font-mono text-xs uppercase tracking-widest text-kraft hover:text-white"
          >
            {t("footprints.viewLink")} →
          </a>
        )}

        {item.tags && item.tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {item.tags.map((tag: string) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-white/50"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <BookmarkButton contentType="footprint" contentId={item.id} />
          <ReactionBar contentType="footprint" contentId={item.id} />
          <StudioEditLink to="/admin/footprints" label={t("collectionEntry.editEntry")} />
        </div>

        <CommentsSection contentType="footprint" contentId={item.id} />

        <div className="mt-16 border-t border-white/10 pt-6">
          <Link
            to="/footprints"
            className="font-mono text-[10px] uppercase tracking-widest text-white/50 hover:text-white"
          >
            ← {t("footprints.title")}
          </Link>
        </div>
      </article>
    </PageShell>
  );
}
