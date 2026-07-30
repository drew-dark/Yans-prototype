import { useEffect } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/** Validates/normalises the `?page=` search param for listing routes. */
export function validatePageSearch(search: Record<string, unknown>): { page: number } {
  const raw = Number(search.page);
  const page = Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
  return { page };
}

/** Supabase `.range()` bounds for a 1-based page. */
export function pageRangeBounds(page: number, pageSize: number) {
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

export function totalPagesFor(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Scrolls back to the top whenever the page changes, honouring reduced motion. */
export function useScrollTopOnPageChange(page: number) {
  const reduced = useReducedMotion();
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);
}

/** Supabase returns 416/PGRST103 when `.range()` starts past the last row. */
export function isRangeOutOfBounds(error: { code?: string } | null): boolean {
  return error?.code === "PGRST103";
}
