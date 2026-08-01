import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/site/SiteChrome";
import { Paginator } from "@/components/site/Paginator";
import { GridSkeleton } from "@/components/site/GridSkeleton";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { isRangeOutOfBounds, pageRangeBounds, totalPagesFor, useScrollTopOnPageChange, validatePageSearch } from "@/lib/pagination";
import { useEffect } from "react";

const PAGE_SIZE = 9;

export const Route = createFileRoute("/shop")({
  validateSearch: validatePageSearch,
  head: () => ({
    meta: [
      { title: "Shop — Emmanuel Rayan Daka" },
      { name: "description", content: "Books, prints, and small things from the Yans Lounge." },
      { property: "og:title", content: "Shop — Yans Lounge" },
      { property: "og:description", content: "Books, prints, and small things from the Yans Lounge." },
    ],
  }),
  component: ShopPage,
});

type Product = {
  id: string; slug: string; title: string; description: string | null;
  image_url: string | null; price_cents: number; currency: string;
  stock: number | null; buy_url: string | null;
};

function formatPrice(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

const shopQuery = (page: number) => ({
  queryKey: ["public", "shop", page] as const,
  queryFn: async () => {
    const { from, to } = pageRangeBounds(page, PAGE_SIZE);
    const { data, error, count } = await supabase
      .from("shop_products")
      .select("id, slug, title, description, image_url, price_cents, currency, stock, buy_url", { count: "exact" })
      .eq("published", true)
      .order("sort_order")
      .range(from, to);
    if (error && !isRangeOutOfBounds(error)) throw error;
    return { items: (data ?? []) as Product[], total: count ?? 0 };
  },
});

function ShopPage() {
  const { page } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const qc = useQueryClient();
  const setPage = (p: number) => navigate({ search: { page: p } });

  const { data, isLoading, isFetching } = useQuery({
    ...shopQuery(page),
    placeholderData: keepPreviousData,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = totalPagesFor(total, PAGE_SIZE);

  useScrollTopOnPageChange(page);

  useEffect(() => {
    if (page < totalPages) qc.prefetchQuery(shopQuery(page + 1));
  }, [page, totalPages, qc]);

  useEffect(() => {
    if (data && page > totalPages) setPage(totalPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, page, totalPages]);

  return (
    <PageShell>
      <section className="mx-auto max-w-6xl px-6 py-16 md:px-12">
        <div className="mb-16 max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.4em] text-kraft before:block before:h-px before:w-8 before:bg-kraft/60">Wares</p>
          <h1 className="font-display text-6xl uppercase leading-none tracking-tight md:text-8xl">Shop</h1>
          <p className="mt-6 text-sm text-white/50 md:text-base">
            Books, prints, zines. Small runs. Purchase links open in a new tab.
          </p>
        </div>

        {isLoading ? (
          <GridSkeleton count={PAGE_SIZE} className="grid gap-8 md:grid-cols-2 lg:grid-cols-3" itemClassName="h-80" />
        ) : items.length === 0 ? (
          <p className="text-white/40">Nothing on the shelf right now.</p>
        ) : (
          <>
            <div
              className={`grid gap-8 transition-opacity duration-200 motion-reduce:transition-none md:grid-cols-2 lg:grid-cols-3 ${isFetching ? "opacity-50" : "opacity-100"}`}
            >
              {items.map((p) => (
                <div key={p.id} className="flex flex-col overflow-hidden border border-white/10 bg-neutral-900/40 transition-colors duration-300 hover:border-kraft/40">
                  {p.image_url && (
                    <div className="aspect-square overflow-hidden bg-neutral-900">
                      <img src={p.image_url} alt={p.title} loading="lazy" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="font-display text-2xl uppercase leading-tight tracking-tight">{p.title}</h2>
                    <p className="mt-1 font-mono text-xs uppercase tracking-widest text-white/50">{formatPrice(p.price_cents, p.currency)}</p>
                    {p.description && <p className="mt-3 text-sm text-white/60 line-clamp-4">{p.description}</p>}
                    <div className="mt-auto pt-4">
                      {p.stock !== null && p.stock <= 0 ? (
                        <span className="inline-block bg-white/5 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-white/40">Sold out</span>
                      ) : p.buy_url ? (
                        <a
                          href={p.buy_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block bg-kraft px-5 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-ink-dark hover:bg-kraft-dark"
                          style={{ clipPath: "polygon(0% 5%, 5% 0%, 95% 2%, 100% 8%, 98% 92%, 100% 100%, 5% 98%, 0% 90%)" }}
                        >
                          Buy →
                        </a>
                      ) : (
                        <span className="inline-block font-mono text-[10px] uppercase tracking-widest text-white/40">Coming soon</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Paginator
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              total={total}
              pageSize={PAGE_SIZE}
              currentCount={items.length}
            />
          </>
        )}

        <div className="mt-20">
          <NewsletterForm source="shop" />
        </div>
      </section>
    </PageShell>
  );
}
