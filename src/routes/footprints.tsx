import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/site/SiteChrome";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { ReactionSummary } from "@/components/site/Reactions";
import {
  Newspaper,
  Video,
  Briefcase,
  Mic,
  MessageCircle,
  BookOpen,
  Award,
  Users,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/footprints")({
  head: () => ({
    meta: [
      { title: "Footprints — The Last Mukwasu" },
      {
        name: "description",
        content: "Past work — news appearances, creator videos, and other projects.",
      },
      { property: "og:title", content: "Footprints — The Last Mukwasu" },
    ],
  }),
  component: FootprintsPage,
});

const CATEGORY_ICON: Record<string, LucideIcon> = {
  news: Newspaper,
  video: Video,
  project: Briefcase,
  podcast: Mic,
  interview: MessageCircle,
  publication: BookOpen,
  award: Award,
  collaboration: Users,
};

type Footprint = {
  id: string;
  slug: string | null;
  title: string;
  category: string;
  role_or_outlet: string | null;
  description: string | null;
  occurred_on: string | null;
  cover_url: string | null;
};

function FootprintsPage() {
  const { t } = useTranslation();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["public", "footprints"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("footprints")
        .select("id, slug, title, category, role_or_outlet, description, occurred_on, cover_url")
        .eq("published", true)
        .order("sort_order");
      if (error) throw error;
      return data as Footprint[];
    },
  });

  return (
    <PageShell>
      <section className="mx-auto max-w-4xl px-5 py-10 md:px-12 md:py-16">
        <div className="mb-16 max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.4em] text-kraft before:block before:h-px before:w-8 before:bg-kraft/60">
            {t("footprints.eyebrow")}
          </p>
          <h1 className="font-display text-5xl uppercase leading-none tracking-tight sm:text-6xl md:text-8xl">
            {t("footprints.title")}
          </h1>
          <p className="mt-6 text-sm text-white/50 md:text-base">{t("footprints.intro")}</p>
        </div>

        {isLoading ? (
          <p className="text-white/40">{t("common.loading")}</p>
        ) : items.length === 0 ? (
          <p className="text-white/40">{t("footprints.empty")}</p>
        ) : (
          <ol className="relative">
            {/* The trail: a single vertical line running through every marker,
                left-aligned on mobile, centered on desktop. */}
            <div
              aria-hidden="true"
              className="absolute left-6 top-2 bottom-2 w-px bg-white/10 md:left-1/2 md:-translate-x-1/2"
            />
            {items.map((item, i) => {
              const Icon = CATEGORY_ICON[item.category] ?? Briefcase;
              const onRight = i % 2 === 0;
              return (
                <li key={item.id} className="relative mb-10 last:mb-0 md:grid md:grid-cols-2 md:gap-10">
                  {/* Marker: the "footprint" itself — a morphism-styled icon
                      bubble sitting on the trail line. */}
                  <div className="absolute left-6 top-0 z-10 -translate-x-1/2 md:left-1/2">
                    <div className="surface-card flex h-12 w-12 items-center justify-center text-kraft">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                  </div>

                  <div
                    className={`ml-16 md:ml-0 ${
                      onRight ? "md:col-start-2 md:pl-10" : "md:col-start-1 md:row-start-1 md:pr-10 md:text-right"
                    }`}
                  >
                    <Link
                      to={item.slug ? "/footprints/$slug" : "/footprints"}
                      params={item.slug ? { slug: item.slug } : undefined}
                      className="group surface-card block overflow-hidden text-left"
                    >
                      {item.cover_url && (
                        <div className="aspect-video overflow-hidden bg-neutral-900">
                          <img
                            src={item.cover_url}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                          />
                        </div>
                      )}
                      <div className="space-y-1.5 p-4">
                        <div
                          className={`flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-kraft ${
                            !onRight ? "md:justify-end" : ""
                          }`}
                        >
                          <span>{item.category}</span>
                          {item.occurred_on && (
                            <>
                              <span className="text-white/20">·</span>
                              <span className="text-white/40">{item.occurred_on}</span>
                            </>
                          )}
                        </div>
                        <h2 className="font-display text-lg uppercase leading-tight">{item.title}</h2>
                        {item.role_or_outlet && (
                          <p className="text-xs text-white/50">{item.role_or_outlet}</p>
                        )}
                        {item.description && (
                          <p className="line-clamp-2 text-sm text-white/60">{item.description}</p>
                        )}
                        <div className={`flex items-center gap-2 pt-1 ${!onRight ? "md:justify-end" : ""}`}>
                          <ReactionSummary contentType="footprint" contentId={item.id} />
                        </div>
                      </div>
                    </Link>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <div className="mt-20">
          <NewsletterForm source="footprints" />
        </div>
      </section>
    </PageShell>
  );
}
