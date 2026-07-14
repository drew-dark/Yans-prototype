import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
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

export function Paginator({ page, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  return (
    <Pagination className="mt-12">
      <PaginationContent className="flex-wrap">
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (page > 1) onPageChange(page - 1);
            }}
            className={
              page === 1
                ? "pointer-events-none opacity-30"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }
          />
        </PaginationItem>

        {pageRange(page, totalPages).map((p, idx) =>
          p === "…" ? (
            <PaginationItem key={`e-${idx}`}>
              <PaginationEllipsis className="text-white/40" />
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationLink
                href="#"
                isActive={p === page}
                onClick={(e) => {
                  e.preventDefault();
                  onPageChange(p);
                }}
                className={
                  p === page
                    ? "border-kraft bg-kraft text-ink-dark hover:bg-kraft-dark"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }
              >
                {p}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (page < totalPages) onPageChange(page + 1);
            }}
            className={
              page === totalPages
                ? "pointer-events-none opacity-30"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
