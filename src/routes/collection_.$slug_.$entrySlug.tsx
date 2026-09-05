import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/site/SiteChrome";
import { Markdown } from "@/lib/markdown";
import { BookmarkButton } from "@/components/site/BookmarkButton";
import { ReactionBar } from "@/components/site/Reactions";
import { CommentsSection } from "@/components/site/CommentsSection";
import { StudioEditLink } from "@/components/site/StudioEditLink";
import { useMediaViewer } from "@/components/site/MediaViewer";
import { getEmbedUrl } from "@/lib/media";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/collection_/$slug/$entrySlug")({
  head: ({ loaderData }) => {
    const e = loaderData as { title?: string } | undefined;
    return {
      meta: e?.title
        ? [{ title: `${e.title} — The Last Mukwasu` }]
        : [{ title: "Entry" }, { name: "robots", content: "noindex" }],
    };
  },
  loader: async ({ params }) => {
    const { data: collection } = await supabase
      .from("collections")
      .select("id, slug, title")
      .eq("slug", params.slug)
      .maybeSingle();
    if (!collection) throw notFound();
    const { data: entry } = await supabase
      .from("collection_entries")
      .select("*")
      .eq("collection_id", collection.id)
      .eq("slug", params.entrySlug)
      .eq("published", true)
      .maybeSingle();
    if (!entry) throw notFound();
    return { collection, entry };
  },
  notFoundComponent: () => (
    <PageShell>
      <div className="mx-auto max-w-2xl px-5 py-16 text-center md:py-24">
        <h1 className="font-display text-6xl uppercase">Not found</h1>
        <Link
          to="/collection"
          className="mt-6 inline-block font-mono text-xs uppercase tracking-widest text-white/60 hover:text-white"
        >
          ← Back to Collections
        </Link>
      </div>
    </PageShell>
  ),
  component: CollectionEntryPage,
});

type Media = {
  id: string;
  kind: "image" | "video" | "audio" | "pdf" | "attachment";
  url: string;
  caption: string | null;
};

function CollectionEntryPage() {
  const { t } = useTranslation();
  const params = Route.useParams();
  const loaderData = Route.useLoaderData();
  const { open } = useMediaViewer();

  const { data: collection } = useQuery({
    queryKey: ["public", "collection", params.slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("id, slug, title")
        .eq("slug", params.slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    initialData: loaderData.collection,
  });

  const { data: entry } = useQuery({
    queryKey: ["public", "collection-entry", collection?.id, params.entrySlug],
    enabled: !!collection?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_entries")
        .select("*")
        .eq("collection_id", collection!.id)
        .eq("slug", params.entrySlug)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    initialData: loaderData.entry,
  });

  const { data: media = [] } = useQuery({
    queryKey: ["public", "collection-entry-media", entry?.id],
    enabled: !!entry?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_entry_media")
        .select("id, kind, url, caption")
        .eq("entry_id", entry!.id)
        .order("sort_order");
      if (error) throw error;
      return data as Media[];
    },
  });

  if (!entry || !collection) return null;

  const images = media.filter((m) => m.kind === "image");
  const videos = media.filter((m) => m.kind === "video");
  const audios = media.filter((m) => m.kind === "audio");
  const pdfs = media.filter((m) => m.kind === "pdf");
  const attachments = media.filter((m) => m.kind === "attachment");

  return (
    <PageShell>
      <article className="mx-auto max-w-3xl px-5 py-10 md:px-12 md:py-16">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-white/40">
          <Link to="/collection" className="hover:text-white">
            {t("collectionsLibrary.title")}
          </Link>
          <span>/</span>
          <Link to="/collection/$slug" params={{ slug: collection.slug }} className="hover:text-white">
            {collection.title}
          </Link>
          <span>/</span>
          <span className="text-white/70">{entry.title}</span>
        </nav>

        <p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-white/40">
          {new Date(entry.entry_date).toLocaleDateString(undefined, {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        <h1 className="mt-2 font-display text-4xl uppercase leading-tight tracking-tight sm:text-5xl md:text-6xl">
          {entry.title}
        </h1>

        {entry.cover_url && (
          <button
            type="button"
            onClick={() => open({ kind: "image", src: entry.cover_url!, alt: entry.title })}
            className="mt-8 block aspect-video w-full overflow-hidden bg-neutral-900"
          >
            <img src={entry.cover_url} alt="" className="h-full w-full object-cover" />
          </button>
        )}

        {entry.body && (
          <Markdown
            text={entry.body}
            dropCap
            className="mt-10 font-sans text-lg leading-[1.75] text-white/80 [&_a]:text-white/90"
          />
        )}

        {images.length > 0 && (
          <div className="mt-10 grid grid-cols-2 gap-2 md:grid-cols-3">
            {images.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => open({ kind: "image", src: m.url, alt: m.caption ?? entry.title, caption: m.caption ?? undefined })}
                className="aspect-square overflow-hidden bg-neutral-900"
              >
                <img src={m.url} alt={m.caption ?? ""} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" />
              </button>
            ))}
          </div>
        )}

        {videos.map((m) => {
          const embed = getEmbedUrl(m.url);
          return (
            <div key={m.id} className="mt-10 aspect-video overflow-hidden bg-black">
              {embed ? (
                <iframe src={embed} title={m.caption ?? entry.title} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
              ) : (
                <video src={m.url} controls className="h-full w-full" />
              )}
            </div>
          );
        })}

        {audios.length > 0 && (
          <div className="mt-10 space-y-3">
            {audios.map((m) => (
              <div key={m.id}>
                {m.caption && (
                  <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-white/40">{m.caption}</p>
                )}
                <audio src={m.url} controls className="w-full" />
              </div>
            ))}
          </div>
        )}

        {(pdfs.length > 0 || attachments.length > 0) && (
          <div className="mt-10 space-y-2">
            {[...pdfs, ...attachments].map((m) => (
              <a
                key={m.id}
                href={m.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 border border-white/10 px-4 py-3 text-sm text-white/70 hover:border-kraft hover:text-white"
              >
                <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                {m.caption || (m.kind === "pdf" ? t("collectionEntry.viewPdf") : t("collectionEntry.viewAttachment"))}
              </a>
            ))}
          </div>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <BookmarkButton contentType="collection_entry" contentId={entry.id} />
          <ReactionBar contentType="collection_entry" contentId={entry.id} />
          <StudioEditLink to="/admin/collections" label={t("collectionEntry.editEntry")} />
        </div>

        <CommentsSection contentType="collection_entry" contentId={entry.id} />

        <div className="mt-16 border-t border-white/10 pt-6">
          <Link
            to="/collection/$slug"
            params={{ slug: collection.slug }}
            className="font-mono text-[10px] uppercase tracking-widest text-white/50 hover:text-white"
          >
            ← {t("collectionEntry.backToCollection")} {collection.title}
          </Link>
        </div>
      </article>
    </PageShell>
  );
}
