import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { getEmbedThumbnail, isPlayable } from "@/lib/media";

type LinkTarget = {
  to: string;
  params?: Record<string, string>;
};

export type ContentCardProps = {
  /** Internal route to navigate to on click. Omit if using onClick instead. */
  to?: LinkTarget;
  /** Custom click handler (e.g. opening a lightbox) instead of navigating. */
  onClick?: () => void;
  /** Cover image, or a raw media URL (YouTube/Drive/etc.) to auto-thumbnail. */
  image?: string | null;
  /** Alternate text for the image. Defaults to the title. */
  imageAlt?: string;
  aspect?: "video" | "square" | "portrait" | "photo";
  /** Small pill in the top-left corner of the image, e.g. a category. */
  badge?: string;
  /** Small mono label above the title, e.g. a date or section name. */
  eyebrow?: string;
  title: string;
  excerpt?: string | null;
  /** Arbitrary footer content — a CTA, price, reactions, a "read more" link. */
  footer?: ReactNode;
  className?: string;
};

const aspectClass: Record<NonNullable<ContentCardProps["aspect"]>, string> = {
  video: "aspect-video",
  square: "aspect-square",
  portrait: "aspect-[3/4]",
  photo: "aspect-[4/3]",
};

/**
 * The shared visual language for a content preview across the site:
 * gallery, footprints, stories, diaries, dear today, shop, and the
 * homepage's "latest" strips. Handles image vs. embeddable-media
 * thumbnails, a consistent hover treatment, and a flexible footer slot
 * so each page can keep its own call to action (read, buy, bookmark).
 */
export function ContentCard({
  to,
  onClick,
  image,
  imageAlt,
  aspect = "video",
  badge,
  eyebrow,
  title,
  excerpt,
  footer,
  className = "",
}: ContentCardProps) {
  const thumb = image ? getEmbedThumbnail(image) ?? image : null;
  const playable = image ? isPlayable(image) : false;

  const body = (
    <>
      {thumb && (
        <div className={`relative overflow-hidden bg-neutral-900 ${aspectClass[aspect]}`}>
          <img
            src={thumb}
            alt={imageAlt ?? title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
          {badge && (
            <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-white/80 backdrop-blur-sm">
              {badge}
            </span>
          )}
          {playable && (
            <span className="absolute right-2 top-2 rounded bg-black/70 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-white/80 backdrop-blur-sm">
              ▶
            </span>
          )}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {eyebrow && (
          <p className="font-mono text-[10px] uppercase tracking-widest text-kraft">{eyebrow}</p>
        )}
        <h3 className="font-display text-lg uppercase leading-tight tracking-tight">{title}</h3>
        {excerpt && <p className="line-clamp-3 text-sm text-white/60">{excerpt}</p>}
        {footer && <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">{footer}</div>}
      </div>
    </>
  );

  const sharedClass = `group flex flex-col overflow-hidden border border-white/10 bg-neutral-900/40 text-left transition-colors duration-300 hover:border-kraft/40 ${className}`;

  if (to) {
    return (
      <Link to={to.to} params={to.params} className={sharedClass}>
        {body}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={sharedClass}>
        {body}
      </button>
    );
  }

  return <div className={sharedClass}>{body}</div>;
}
