import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/site/SiteChrome";
import { Link } from "@tanstack/react-router";

const searchSchema = z.object({ token: z.string().optional() });

export const Route = createFileRoute("/newsletter_/confirm")({
  head: () => ({
    meta: [
      { title: "Confirm subscription — The Last Mukwasu" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: searchSchema,
  component: ConfirmPage,
});

function ConfirmPage() {
  const { token } = Route.useSearch();
  const { data: confirmed, isLoading } = useQuery({
    queryKey: ["newsletter-confirm", token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("confirm_newsletter_subscriber", {
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
          <h1 className="mt-4 font-display text-3xl uppercase">Missing confirmation link</h1>
        ) : isLoading ? (
          <h1 className="mt-4 font-display text-3xl uppercase">Confirming…</h1>
        ) : confirmed ? (
          <>
            <h1 className="mt-4 font-display text-4xl uppercase">You're confirmed</h1>
            <p className="mt-4 text-white/60">
              Letters from the lounge will start landing in your inbox.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-4 font-display text-3xl uppercase">Link expired or already used</h1>
            <p className="mt-4 text-white/60">
              Confirmation links are valid for 7 days. If you still want in, subscribe again below.
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
