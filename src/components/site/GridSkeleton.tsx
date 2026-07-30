interface Props {
  count?: number;
  /** Tailwind classes for the grid container. */
  className?: string;
  /** Tailwind classes applied to each placeholder cell. */
  itemClassName?: string;
}

export function GridSkeleton({
  count = 6,
  className = "grid gap-8 md:grid-cols-2",
  itemClassName = "aspect-[16/10]",
}: Props) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse border border-white/10 bg-white/5 motion-reduce:animate-none ${itemClassName}`}
        />
      ))}
    </div>
  );
}
