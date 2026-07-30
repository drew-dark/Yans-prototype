## Goal
Pagination currently works but is basic: page lives in component state only (lost on refresh/back), the grid blanks out to a "Loading…" line on every page change, there's no sense of how many items exist, and some listing pages (Collection, Dear Today, admin lists) have no pagination at all.

## What changes

**1. Page state in the URL**
Each listing route (`/gallery`, `/diaries`, `/stories`, `/shop`) gains a validated `?page=` search param. Benefits: shareable/bookmarkable pages, browser back/forward works, refresh keeps position. Invalid or out-of-range values clamp to a valid page.

**2. No more blank flashes**
Keep the previous page's results on screen while the next page loads, with a subtle dimming/loading state instead of replacing the grid with text. First load still shows a skeleton grid matching the card layout rather than a bare "Loading…" line.

**3. Prefetch the next page**
When a page renders, quietly warm the next page's data so forward navigation feels instant.

**4. Result context**
Above/below each grid: "Showing 7–12 of 34". Paginator gets a compact mobile layout (Prev / "Page 2 of 6" / Next) and the full numbered range on larger screens.

**5. Accessibility and polish in `Paginator`**
- `aria-label` on prev/next/page links, `aria-current="page"` on the active page
- disabled states use real disabled semantics, not just `pointer-events-none`
- scroll-to-top respects reduced-motion (uses the existing `useReducedMotion` hook)
- ellipsis marked `aria-hidden`

**6. Wider coverage**
- Add the same pagination to `/collection` and `/collection/dear-today` listings.
- Add pagination to the Studio lists that currently fetch a fixed slice — notably `/admin/comments` (hard-capped at 200) and the other admin content lists — so long content sets stay manageable.

## Technical notes
- `Paginator` keeps its `page`/`totalPages`/`onPageChange` API and gains optional `total`, `pageSize`, and `compact` props, so existing call sites stay valid.
- Routes use TanStack Router `validateSearch` + `useNavigate({ search })` for page state; queries keep `queryKey: [..., page]` and add `placeholderData: keepPreviousData`.
- Prefetch uses `queryClient.prefetchQuery` with the same query options factory, extracted per route so loader/prefetch/component share one definition.
- Supabase `.range()` + `{ count: "exact" }` logic is unchanged.

## Out of scope
Infinite scroll / "load more" — this keeps classic numbered pagination. Say the word if you'd prefer infinite scroll on Gallery instead.
