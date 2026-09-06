import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { useTranslation } from "react-i18next";

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Total number of items across all pages — enables the "Showing x–y of z" line. */
  total?: number;
  pageSize?: number;
  /** Number of items rendered on the current page (defaults to pageSize math). */
  currentCount?: number;
  className?: string;
}

function pageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("…");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}

export function Paginator({
  page,
  totalPages,
  onPageChange,
  total,
  pageSize,
  currentCount,
  className = "",
}: Props) {
  const { t } = useTranslation();
  const showSummary = typeof total === "number" && typeof pageSize === "number" && total > 0;
  const first = (page - 1) * (pageSize ?? 0) + 1;
  const last = Math.min(total ?? 0, first - 1 + (currentCount ?? pageSize ?? 0));

  if (totalPages <= 1 && !showSummary) return null;

  const atStart = page <= 1;
  const atEnd = page >= totalPages;

  const navClass = (disabled: boolean) =>
    `min-h-11 select-none px-3 sm:min-h-9 ${
      disabled
        ? "pointer-events-none opacity-30"
        : "text-white/70 hover:bg-white/10 hover:text-white active:bg-white/20"
    }`;

  return (
    <div className={`mt-12 flex flex-col items-center gap-3 ${className}`}>
      {showSummary && (
        <p
          aria-live="polite"
          className="font-mono text-[10px] uppercase tracking-widest text-white/40"
        >
          {t("paginator.showing", { first, last, total })}
        </p>
      )}

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent className="w-full flex-nowrap items-center justify-between gap-1 sm:w-auto sm:flex-wrap sm:justify-center">
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-label={t("paginator.prevAria")}
                aria-disabled={atStart}
                tabIndex={atStart ? -1 : 0}
                onClick={(e) => {
                  e.preventDefault();
                  if (!atStart) onPageChange(page - 1);
                }}
                className={navClass(atStart)}
              />
            </PaginationItem>

            {/* Compact indicator on small screens */}
            <PaginationItem className="sm:hidden">
              <span
                aria-live="polite"
                className="whitespace-nowrap px-2 font-mono text-[11px] uppercase tracking-widest text-white/60"
              >
                {t("paginator.pageIndicator", { page, totalPages })}
              </span>
            </PaginationItem>

            <span className="hidden items-center gap-1 sm:flex">
              {pageRange(page, totalPages).map((p, idx) =>
                p === "…" ? (
                  <PaginationItem key={`e-${idx}`}>
                    <PaginationEllipsis className="text-white/40" aria-hidden="true" />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={p}>
                    <PaginationLink
                      href="#"
                      isActive={p === page}
                      aria-label={t("paginator.pageAria", { page: p })}
                      aria-current={p === page ? "page" : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        onPageChange(p);
                      }}
                      className={
                        p === page
                          ? "border-kraft bg-kraft text-ink-dark hover:bg-kraft-dark"
                          : "text-white/70 hover:bg-white/10 hover:text-white active:bg-white/20"
                      }
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}
            </span>

            <PaginationItem>
              <PaginationNext
                href="#"
                aria-label={t("paginator.nextAria")}
                aria-disabled={atEnd}
                tabIndex={atEnd ? -1 : 0}
                onClick={(e) => {
                  e.preventDefault();
                  if (!atEnd) onPageChange(page + 1);
                }}
                className={navClass(atEnd)}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
