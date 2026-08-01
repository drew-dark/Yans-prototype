import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { useMediaViewer } from "@/components/site/MediaViewer";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import portraitImg from "@/assets/muyan-portrait.jpg";
import broadcastImg from "@/assets/muyan-broadcast.jpg";
import foodImg from "@/assets/muyan-food.jpg";
import verseImg from "@/assets/muyan-verse.jpg";
import stageImg from "@/assets/muyan-stage.jpg";

const heroOffsets = ["mt-0", "mt-12", "-mt-8", "mt-20", "-mt-16"];

// Swapped: hero now uses the images previously in the Muyan collection strip;
// Muyan collection uses the images previously in the hero.
const fallbackHero = [portraitImg, broadcastImg, foodImg, verseImg, stageImg];

const fallbackTiles = [
  { id: "1", image_url: foodImg, label: "Culture" },
  { id: "2", image_url: stageImg, label: "Stage" },
  { id: "3", image_url: portraitImg, label: "Portrait" },
  { id: "4", image_url: verseImg, label: "Verse" },
  { id: "5", image_url: broadcastImg, label: "Broadcast" },
  { id: "6", image_url: stageImg, label: "Field" },
  { id: "7", image_url: foodImg, label: "Table" },
  { id: "8", image_url: portraitImg, label: "Studio" },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Emmanuel Rayan Daka — Poet · Author · Journalist · Broadcaster" },
      {
        name: "description",
        content:
          "The Muyan Collection — words carved from quiet places by Zambian poet and journalist Emmanuel Rayan Daka.",
      },
      { property: "og:title", content: "Emmanuel Rayan Daka — Muyan Collection" },
      {
        property: "og:description",
        content:
          "Words carved from quiet places. Poetry, stories, and broadcasts from Lusaka to Tokyo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const navLinks = [
  { to: "/collection", label: "Collection" },
  { to: "/gallery", label: "Gallery" },
  { to: "/diaries", label: "Gaijin Diaries" },
  { to: "/stories", label: "Stories" },
  { to: "/shop", label: "Shop" },
  { to: "/about", label: "About" },
] as const;

function Index() {
  const { data: heroImages = fallbackHero } = useQuery({
    queryKey: ["public", "hero_images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hero_images")
        .select("image_url, alt")
        .eq("published", true)
        .order("sort_order");
      if (error) throw error;
      return data.length > 0 ? data.map((d) => d.image_url) : fallbackHero;
    },
  });

  const { data: tiles = fallbackTiles } = useQuery({
    queryKey: ["public", "collection_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_items")
        .select("id, image_url, label")
        .eq("published", true)
        .order("sort_order");
      if (error) throw error;
      return data.length > 0 ? data : fallbackTiles;
    },
  });

  const { data: about } = useQuery({
    queryKey: ["public", "about"],
    queryFn: async () => {
      const { data } = await supabase.from("about_content").select("*").maybeSingle();
      return data;
    },
  });

  const { data: latestStories = [] } = useQuery({
    queryKey: ["public", "home", "stories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("id, slug, title, excerpt, cover_image_url, chapter_number, chapter_title")
        .eq("published", true)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: latestShop = [] } = useQuery({
    queryKey: ["public", "home", "shop"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_products")
        .select("id, slug, title, description, image_url, price_cents, currency")
        .eq("published", true)
        .order("sort_order")
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: latestDear = [] } = useQuery({
    queryKey: ["public", "home", "dear_today"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dear_today" as never)
        .select("id, slug, title, excerpt, cover_url, entry_date")
        .eq("published", true)
        .order("entry_date", { ascending: false })
        .limit(6);
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string;
        slug: string;
        title: string;
        excerpt: string | null;
        cover_url: string | null;
        entry_date: string;
      }>;
    },
  });

  const headline = about?.headline || "EMMANUEL RAYAN DAKA";
  const tagline =
    about?.tagline ||
    "These are words carved from quiet places — am just a Zambian poet and journalist writing the things we rarely say out loud.";
  const location = about?.location || "Lusaka, Zambia — Tokyo, Japan";
  const { open } = useMediaViewer();
  const reduceMotion = useReducedMotion();
  const imageTransitionClass = reduceMotion ? "" : "transition-transform duration-700";
  const hoverImageClass = reduceMotion ? "" : "group-hover:scale-[1.6]";

  return (
    <main
      className="relative min-h-screen w-full overflow-hidden font-sans text-white"
      style={{
        backgroundColor: "#0a0a0a",
        backgroundImage:
          "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.03) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.03) 0%, transparent 50%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-white opacity-10 blur-3xl" />
        <div className="absolute -bottom-40 -right-20 h-[600px] w-[600px] rounded-full bg-white opacity-5 blur-[120px]" />
      </div>

      {/* Mobile top bar: name tag + section nav */}
      <div className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-md md:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div
            className="-rotate-1 transform bg-kraft px-3 py-1.5 shadow-xl"
            style={{
              clipPath:
                "polygon(0% 5%, 5% 0%, 95% 2%, 100% 8%, 98% 92%, 100% 100%, 5% 98%, 0% 90%)",
            }}
          >
            <h1 className="font-mono text-[11px] font-bold leading-none tracking-tight text-ink-dark">
              {headline.toUpperCase()}
            </h1>
            <p className="mt-1 font-mono text-[8px] uppercase tracking-widest text-ink-dark/80">
              Poet · Journalist · Broadcaster
            </p>
          </div>
          <Link
            to="/account"
            className="shrink-0 border border-white/20 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-white/60"
          >
            ◇ Account
          </Link>
        </div>
        <nav
          aria-label="Sections"
          className="flex items-center gap-1 overflow-x-auto border-b border-white/10 px-3 pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="whitespace-nowrap px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-white/50"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="absolute left-8 top-8 z-50 hidden md:block">
        <div
          className="-rotate-1 transform bg-kraft px-6 py-3 shadow-xl"
          style={{
            clipPath:
              "polygon(0% 5%, 5% 0%, 95% 2%, 100% 8%, 98% 92%, 100% 100%, 5% 98%, 0% 90%)",
          }}
        >
          <h1 className="font-mono text-lg font-bold leading-none tracking-tight text-ink-dark">
            {headline.toUpperCase()}
          </h1>
          <div className="my-1 h-px bg-ink-dark/20" />
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-dark">
            Poet · Author · Journalist · Broadcaster
          </p>
        </div>
      </div>

      <nav className="absolute right-12 top-12 z-40 hidden items-center space-x-8 text-[11px] font-bold uppercase tracking-[0.3em] text-white/70 md:flex">
        {navLinks.map((link) => (
          <Link key={link.to} to={link.to} className="transition-colors hover:text-white">
            {link.label}
          </Link>
        ))}

        <Link
          to="/account"
          className="ml-2 border border-white/20 px-2 py-1 font-mono text-[10px] tracking-widest text-white/40 hover:border-white hover:text-white"
          title="Your account"
        >
          ◇ Account
        </Link>
        <Link
          to="/admin"
          className="border border-white/20 px-2 py-1 font-mono text-[10px] tracking-widest text-white/40 hover:border-white hover:text-white"
          title="Studio access for the editor"
        >
          ◆ Studio
        </Link>
      </nav>

      <section className="relative flex flex-col items-center justify-center px-4 py-12 md:min-h-screen md:py-20">
        <div
          className="absolute right-8 top-1/2 hidden -translate-y-1/2 rotate-180 font-mono text-[10px] uppercase tracking-[0.5em] text-white/30 md:block"
          style={{ writingMode: "vertical-rl" }}
        >
          YANS LOUNGE © 2026
        </div>

        <p className="text-center font-mono text-[9px] uppercase tracking-[0.35em] text-white/40 md:text-[10px] md:tracking-[0.5em]">
          Poet · Author · Journalist · Broadcaster
        </p>

        <div className="group relative mt-8 flex h-[34vh] w-full max-w-6xl items-center justify-center gap-1.5 md:mt-14 md:h-[50vh] md:gap-4">
          {heroImages.map((src, i) => (
            <div
              key={i}
              className={`h-full flex-1 -skew-x-6 transform overflow-hidden md:-skew-x-12 ${heroOffsets[i % heroOffsets.length]} ${i > 2 ? "hidden sm:block" : ""}`}
            >
              <img
                src={src}
                alt=""
                loading="lazy"
                className={`h-full w-full skew-x-6 scale-125 transform object-cover md:skew-x-12 md:scale-150 ${imageTransitionClass} ${hoverImageClass}`}
              />
            </div>
          ))}
        </div>

        <p className="mt-8 max-w-xl text-balance text-center text-sm font-light leading-relaxed text-white/60 md:mt-12 md:text-lg">
          {tagline}
        </p>
        <div className="mt-8 flex w-full max-w-xs flex-col items-stretch gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:gap-4 md:mt-10">
          <Link
            to="/collection"
            className="border border-white/30 px-6 py-3.5 text-center font-mono text-[11px] uppercase tracking-[0.25em] text-white hover:bg-white hover:text-ink-dark"
          >
            Enter the Collection →
          </Link>
          <Link
            to="/stories"
            className="px-6 py-3 text-center font-mono text-[11px] uppercase tracking-[0.25em] text-white/60 hover:text-white"
          >
            Read stories
          </Link>
        </div>
      </section>


      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-16 md:px-12 md:pb-20">
        <div className="mb-6 flex items-end justify-between gap-6 md:mb-10">
          <div className="min-w-0">
            <p className="mb-2 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.4em] text-kraft before:block before:h-px before:w-8 before:bg-kraft/60 md:mb-3">
              Volume 01
            </p>
            <h3 className="font-display text-4xl uppercase leading-none tracking-tight sm:text-5xl md:text-7xl">
              Muyan Collection
            </h3>
          </div>
          <Link
            to="/collection"
            className="hidden shrink-0 font-mono text-[10px] uppercase tracking-widest text-white/60 hover:text-white md:inline"
          >
            View all →
          </Link>
        </div>

        <div className="group/strip -mx-5 flex h-[36vh] snap-x snap-mandatory items-stretch gap-1 overflow-x-auto px-5 pb-2 [scrollbar-width:none] md:mx-0 md:h-[58vh] md:snap-none md:gap-2 md:overflow-hidden md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
          {tiles.slice(0, 8).map((t, i) => {
            const heights = ["h-[88%]", "h-full", "h-[72%]", "h-[95%]", "h-[80%]", "h-full", "h-[75%]", "h-[92%]"];
            const aligns = ["self-end", "self-start", "self-end", "self-center", "self-start", "self-end", "self-center", "self-start"];
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => open({ kind: "image", src: t.image_url, alt: t.label, caption: t.label })}
                className={`relative w-[44vw] shrink-0 snap-start overflow-hidden border border-white/10 bg-neutral-900 text-left md:w-auto md:flex-1 md:shrink ${heights[i % heights.length]} ${aligns[i % aligns.length]} ${imageTransitionClass} md:hover:z-10 md:hover:flex-[2] md:focus-visible:z-10 md:focus-visible:flex-[2] focus:outline-none`}
                aria-label={t.label}
              >
                <img
                  src={t.image_url}
                  alt={t.label}
                  loading="lazy"
                  className={`h-full w-full object-cover ${imageTransitionClass} ${hoverImageClass} md:group-hover/strip:opacity-40 md:hover:!opacity-100 md:focus-visible:!opacity-100`}
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2.5 md:p-3">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-white md:text-[10px]">{t.label}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-between md:hidden">
          <span className="font-mono text-[9px] uppercase tracking-widest text-white/30">
            Swipe →
          </span>
          <Link to="/collection" className="font-mono text-[10px] uppercase tracking-widest text-white/60">
            View all →
          </Link>
        </div>
      </section>


      {/* Latest Stories */}
      {(
        <section className="relative z-10 mx-auto max-w-6xl px-5 pb-16 md:px-12 md:pb-20">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 md:mb-8">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.4em] text-kraft before:block before:h-px before:w-8 before:bg-kraft/60">
                Latest
              </p>
              <h3 className="font-display text-3xl uppercase leading-none tracking-tight sm:text-4xl md:text-6xl">
                Stories
              </h3>
            </div>
            <Link to="/stories" className="font-mono text-[10px] uppercase tracking-widest text-white/60 hover:text-white">
              All stories →
            </Link>
          </div>
          {latestStories.length === 0 && (
            <p className="border border-dashed border-white/15 p-6 text-sm text-white/40">
              No stories published yet — publish one in the Studio and it will appear here.
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {latestStories.map((s) => (
              <Link
                key={s.id}
                to="/stories/$slug"
                params={{ slug: s.slug }}
                className="group flex flex-col overflow-hidden border border-white/10 bg-neutral-900/40 transition-colors duration-300 hover:border-kraft/40 transition-colors hover:border-white/40"
              >
                {s.cover_image_url && (
                  <div className="aspect-[16/10] overflow-hidden">
                    <img
                      src={s.cover_image_url}
                      alt=""
                      loading="lazy"
                      className={`h-full w-full object-cover ${imageTransitionClass} group-hover:scale-105`}
                    />
                  </div>
                )}
                <div className="p-4">
                  {s.chapter_number != null && (
                    <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
                      Chapter {s.chapter_number}
                      {s.chapter_title ? ` — ${s.chapter_title}` : ""}
                    </p>
                  )}
                  <h4 className="font-display text-xl uppercase leading-tight">{s.title}</h4>
                  {s.excerpt && <p className="mt-2 line-clamp-2 text-sm text-white/60">{s.excerpt}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Books / Shop */}
      {(
        <section className="relative z-10 mx-auto max-w-6xl px-5 pb-16 md:px-12 md:pb-20">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 md:mb-8">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.4em] text-kraft before:block before:h-px before:w-8 before:bg-kraft/60">
                From the shelf
              </p>
              <h3 className="font-display text-3xl uppercase leading-none tracking-tight sm:text-4xl md:text-6xl">
                Books &amp; Wares
              </h3>
            </div>
            <Link to="/shop" className="font-mono text-[10px] uppercase tracking-widest text-white/60 hover:text-white">
              Visit shop →
            </Link>
          </div>
          {latestShop.length === 0 && (
            <p className="border border-dashed border-white/15 p-6 text-sm text-white/40">
              No books or wares published yet — add them in the Studio shop editor.
            </p>
          )}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {latestShop.map((p) => (
              <Link
                key={p.id}
                to="/shop"
                className="group flex flex-col overflow-hidden border border-white/10 bg-neutral-900/40 transition-colors duration-300 hover:border-kraft/40 transition-colors hover:border-white/40"
              >
                {p.image_url && (
                  <div className="aspect-[3/4] overflow-hidden">
                    <img
                      src={p.image_url}
                      alt=""
                      loading="lazy"
                      className={`h-full w-full object-cover ${imageTransitionClass} group-hover:scale-105`}
                    />
                  </div>
                )}
                <div className="p-3">
                  <h4 className="line-clamp-2 font-display text-sm uppercase leading-tight">{p.title}</h4>
                  {p.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-white/50">{p.description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Dear Today */}
      {(
        <section className="relative z-10 mx-auto max-w-6xl px-5 pb-16 md:px-12 md:pb-20">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 md:mb-8">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.4em] text-kraft before:block before:h-px before:w-8 before:bg-kraft/60">
                A collection
              </p>
              <h3 className="font-display text-3xl uppercase leading-none tracking-tight sm:text-4xl md:text-6xl">
                Dear Today
              </h3>
            </div>
            <Link
              to="/collection/dear-today"
              className="font-mono text-[10px] uppercase tracking-widest text-white/60 hover:text-white"
            >
              View all →
            </Link>
          </div>
          {latestDear.length === 0 && (
            <p className="border border-dashed border-white/15 p-6 text-sm text-white/40">
              No Dear Today entries published yet — write one in the Studio.
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {latestDear.map((d) => (
              <Link
                key={d.id}
                to="/collection/dear-today/$slug"
                params={{ slug: d.slug }}
                className="group flex flex-col overflow-hidden border border-white/10 bg-neutral-900/40 transition-colors duration-300 hover:border-kraft/40 transition-colors hover:border-white/40"
              >
                {d.cover_url && (
                  <div className="aspect-[16/10] overflow-hidden">
                    <img
                      src={d.cover_url}
                      alt=""
                      loading="lazy"
                      className={`h-full w-full object-cover ${imageTransitionClass} group-hover:scale-105`}
                    />
                  </div>
                )}
                <div className="p-4">
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
                    {new Date(d.entry_date).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <h4 className="font-display text-xl uppercase leading-tight">{d.title}</h4>
                  {d.excerpt && <p className="mt-2 line-clamp-2 text-sm text-white/60">{d.excerpt}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="relative z-10 mx-auto max-w-2xl px-5 pb-20 md:px-12 md:pb-24">
        <NewsletterForm source="home" variant="kraft" />
      </section>

      <footer className="flex flex-col items-start justify-between gap-8 border-t border-white/5 px-5 py-10 md:flex-row md:items-end md:p-12">
        <div>
          <span className="mb-2 block font-mono text-[9px] uppercase tracking-widest text-white/30">
            Currently Residing
          </span>
          <span className="text-sm uppercase tracking-widest">{location}</span>
        </div>
        <div className="w-full md:w-auto md:text-right">
          <Link
            to="/about"
            className="inline-block cursor-pointer bg-kraft px-6 py-2 text-ink-dark shadow-lg transition-transform hover:-translate-y-0.5"
            style={{
              clipPath:
                "polygon(0% 5%, 5% 0%, 95% 2%, 100% 8%, 98% 92%, 100% 100%, 5% 98%, 0% 90%)",
            }}
          >
            <span className="font-mono text-xs font-bold uppercase tracking-tighter">
              ✎ Enter the Lounge →
            </span>
          </Link>
          <div className="mt-2 font-mono text-[9px] uppercase tracking-widest text-white/30">
            Readers · public site
          </div>
        </div>
      </footer>
    </main>
  );
}
