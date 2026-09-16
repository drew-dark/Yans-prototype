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
