import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/site/SiteChrome";
import { NewsletterForm } from "@/components/site/NewsletterForm";

export const Route = createFileRoute("/newsletter")({
  head: () => ({
    meta: [
      { title: "Newsletter — The Last Mukwasu" },
      {
        name: "description",
        content:
          "Letters from the Lounge — occasional dispatches on new poems, diaries, and shop drops.",
      },
    ],
  }),
  component: NewsletterPage,
});

function NewsletterPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-2xl px-5 py-16 md:px-12 md:py-24">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-kraft">Mailing list</p>
        <h1 className="mt-3 font-display text-4xl uppercase leading-tight tracking-tight sm:text-5xl md:text-6xl">
          Letters from the Lounge
        </h1>
        <p className="mt-5 max-w-lg text-white/60">
          Occasional dispatches when there's something worth sending — new poems, diary entries,
          Dear Today notes, and shop drops. No noise, no schedule to keep.
        </p>
        <div className="mt-10">
          <NewsletterForm source="newsletter_page" />
        </div>
      </div>
    </PageShell>
  );
}
