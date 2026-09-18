import type { ReactNode } from "react";

type BentoSpan = 1 | 2 | 3;

/** A varied-span grid — the layout half of immersive mode. Cells use
 * .surface-card (same class as ContentCard etc.) rather than new CSS, so
 * a cell renders flat/paper-cut, frosted glass, or soft clay purely
 * based on which of the 11 themes is active — see styles.css. */
export function BentoGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`grid grid-cols-2 auto-rows-[130px] gap-3 sm:grid-cols-4 sm:auto-rows-[150px] sm:gap-4 ${className}`}>
      {children}
    </div>
  );
}

export function BentoCell({
  children,
  colSpan = 1,
  rowSpan = 1,
  className = "",
}: {
  children: ReactNode;
  colSpan?: BentoSpan;
  rowSpan?: BentoSpan;
  className?: string;
}) {
  const colClass = { 1: "col-span-2 sm:col-span-1", 2: "col-span-2", 3: "col-span-2 sm:col-span-3" }[colSpan];
  const rowClass = { 1: "row-span-1", 2: "row-span-2", 3: "row-span-3" }[rowSpan];
  return (
    <div className={`surface-card overflow-hidden p-4 ${colClass} ${rowClass} ${className}`}>{children}</div>
  );
}

/**
 * The richer Magic UI-style cell: a background image layer (subtly
 * scaled on hover), a gradient scrim so the label stays readable
 * regardless of image content, and an optional CTA that's always
 * visible but brightens on hover — same "background layer + reveal"
 * shape as Magic UI's BentoCard, adapted onto .surface-card so it still
 * inherits flat/glass/clay per the active theme rather than fighting it
 * with its own fixed styling.
 *
 * Use BentoCell directly for content that isn't image-led (profile
 * rows, timeline entries); use BentoCard for anything with a photo.
 */
export function BentoCard({
  image,
  label,
  ctaLabel,
  ctaHref,
  onClick,
  colSpan = 1,
  rowSpan = 1,
  className = "",
}: {
  image?: string;
  label: string;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  onClick?: () => void;
  colSpan?: BentoSpan;
  rowSpan?: BentoSpan;
  className?: string;
}) {
  return (
    <BentoCell colSpan={colSpan} rowSpan={rowSpan} className={`group/bento relative !p-0 ${className}`}>
      {/* The card body is its own click target (opens the lightbox, via
          onClick) — the CTA below is a second, independent click target
          layered on top with stopPropagation, so a tile can open the
          lightbox AND link somewhere else at the same time, rather than
          being forced to pick one. */}
      {onClick ? (
        <button type="button" onClick={onClick} className="relative block h-full w-full text-left">
          {image && (
            <img
              src={image}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover/bento:scale-105"
            />
          )}
        </button>
      ) : (
        image && (
          <img
            src={image}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover/bento:scale-105"
          />
        )
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent p-3">
        <p className="pointer-events-none font-mono text-[10px] uppercase tracking-widest text-white">{label}</p>
        {ctaLabel && ctaHref && (
          <a
            href={ctaHref}
            onClick={(e) => e.stopPropagation()}
            className="pointer-events-auto relative z-10 mt-0.5 inline-block font-mono text-[9px] uppercase tracking-widest text-white/60 opacity-70 transition-opacity hover:opacity-100 hover:text-white hover:underline"
          >
            {ctaLabel} →
          </a>
        )}
      </div>
    </BentoCell>
  );
}
