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
const fallbackHero = [foodImg, stageImg, portraitImg, verseImg, broadcastImg];

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

const fallbackTiles = [
  { id: "1", image_url: portraitImg, label: "Portrait" },
  { id: "2", image_url: broadcastImg, label: "Broadcast" },
  { id: "3", image_url: foodImg, label: "Culture" },
  { id: "4", image_url: verseImg, label: "Verse" },
  { id: "5", image_url: stageImg, label: "Stage" },
  { id: "6", image_url: portraitImg, label: "Studio" },
  { id: "7", image_url: broadcastImg, label: "Field" },
  { id: "8", image_url: foodImg, label: "Table" },
];

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
      return data.length > 0
        ? data.map((d) => d.image_url)
        : fallbackHero;
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

  const headline = about?.headline || "EMMANUEL RAYAN DAKA";
  const tagline = about?.tagline || "These are words carved from quiet places — am just a Zambian poet and journalist writing the things we rarely say out loud.";
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

      <div className="absolute left-8 top-8 z-50">
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
          <Link
            key={link.to}
            to={link.to}
            className="transition-colors hover:text-white"
          >
            {link.label}
          </Link>
        ))}

        <Link
          to="/admin"
          className="ml-2 border border-white/20 px-2 py-1 font-mono text-[10px] tracking-widest text-white/40 hover:border-white hover:text-white"
          title="Studio access for the editor"
        >
          ◆ Studio
        </Link>
      </nav>

      <section className="relative flex min-h-screen flex-col items-center justify-center px-4 py-20">
        <div
          className="absolute right-8 top-1/2 -translate-y-1/2 rotate-180 font-mono text-[10px] uppercase tracking-[0.5em] text-white/30"
          style={{ writingMode: "vertical-rl" }}
        >
          YANS LOUNGE © 2026
        </div>

        <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-white/40">
          Poet · Author · Journalist · Broadcaster
        </p>

        <div className="group relative mt-14 flex h-[42vh] w-full max-w-6xl items-center justify-center gap-2 md:h-[50vh] md:gap-4">
          {heroImages.map((src, i) => (
            <div
              key={i}
              className={`h-full flex-1 -skew-x-12 transform overflow-hidden ${heroOffsets[i % heroOffsets.length]}`}
            >
              <img
                src={src}
                alt=""
                loading="lazy"
                className={`h-full w-full skew-x-12 scale-150 transform object-cover ${imageTransitionClass} ${hoverImageClass}`}
              />
            </div>
          ))}
        </div>

        <p className="mt-12 max-w-xl text-center text-sm font-light leading-relaxed text-white/60 md:text-lg">
          {tagline}
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/collection"
            className="border border-white/30 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.3em] text-white hover:bg-white hover:text-ink-dark"
          >
            Enter the Collection →
          </Link>
          <Link
            to="/stories"
            className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/60 hover:text-white"
          >
            Read stories
          </Link>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-20 md:px-12">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.4em] text-white/40">
              Volume 01
            </p>
            <h3 className="font-display text-5xl uppercase leading-none tracking-tight md:text-7xl">
              Muyan Collection
            </h3>
          </div>
          <Link
            to="/collection"
            className="hidden font-mono text-[10px] uppercase tracking-widest text-white/60 hover:text-white md:inline"
          >
            View all →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {tiles.slice(0, 8).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() =>
                open({ kind: "image", src: t.image_url, alt: t.label, caption: t.label })
              }
              className="group relative aspect-[3/4] overflow-hidden border border-white/10 bg-neutral-900 text-left"
              aria-label={t.label}
            >
              <img
                src={t.image_url}
                alt={t.label}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-white">
                  {t.label}
                </p>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 text-right md:hidden">
          <Link
            to="/collection"
            className="font-mono text-[10px] uppercase tracking-widest text-white/60 hover:text-white"
          >
            View all →
          </Link>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-2xl px-6 pb-24 md:px-12">
        <NewsletterForm source="home" variant="kraft" />
      </section>



      <footer className="flex flex-col items-end justify-between gap-8 border-t border-white/5 p-12 md:flex-row">
        <div>
          <span className="mb-2 block font-mono text-[9px] uppercase tracking-widest text-white/30">
            Currently Residing
          </span>
          <span className="text-sm uppercase tracking-widest">
            {location}
          </span>
        </div>
        <div className="text-right">
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
