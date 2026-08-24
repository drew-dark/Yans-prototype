import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/site/SiteChrome";

const searchSchema = z.object({ token: z.string().optional() });

export const Route = createFileRoute("/newsletter_/unsubscribe")({
  head: () => ({
    meta: [{ title: "Unsubscribe — The Last Mukwasu" }, { name: "robots", content: "noindex" }],
  }),
  validateSearch: searchSchema,
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const { token } = Route.useSearch();
  const { data: unsubscribed, isLoading } = useQuery({
    queryKey: ["newsletter-unsubscribe", token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("unsubscribe_newsletter_subscriber", {
        p_token: token!,
      });
      if (error) throw error;
      return data as boolean;
    },
  });

  return (
    <PageShell>
      <div className="mx-auto max-w-lg px-5 py-20 text-center md:py-28">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-kraft">Newsletter</p>
        {!token ? (
          <h1 className="mt-4 font-display text-3xl uppercase">Missing unsubscribe link</h1>
        ) : isLoading ? (
          <h1 className="mt-4 font-display text-3xl uppercase">One moment…</h1>
        ) : unsubscribed ? (
          <>
            <h1 className="mt-4 font-display text-4xl uppercase">You're unsubscribed</h1>
            <p className="mt-4 text-white/60">
              You won't hear from the mailing list again. You're always welcome back.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-4 font-display text-3xl uppercase">Link not recognised</h1>
            <p className="mt-4 text-white/60">
              This link may have already been used, or has expired.
            </p>
          </>
        )}
        <Link
          to="/"
          className="mt-8 inline-block font-mono text-xs uppercase tracking-widest text-white/50 hover:text-white"
        >
          ← Back home
        </Link>
      </div>
    </PageShell>
  );
}
