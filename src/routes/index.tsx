import { createFileRoute } from "@tanstack/react-router";
import portraitImg from "@/assets/muyan-portrait.jpg";
import broadcastImg from "@/assets/muyan-broadcast.jpg";
import foodImg from "@/assets/muyan-food.jpg";
import verseImg from "@/assets/muyan-verse.jpg";
import stageImg from "@/assets/muyan-stage.jpg";

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

const tiles = [
  { src: portraitImg, label: "Portrait", offset: "mt-0" },
  { src: broadcastImg, label: "Broadcast", offset: "mt-12" },
  { src: foodImg, label: "Culture", offset: "-mt-8" },
  { src: verseImg, label: "Verse", offset: "mt-20" },
  { src: stageImg, label: "Stage", offset: "-mt-16" },
];

const navLinks = ["Gallery", "Gaijin Diaries", "Stories", "Shop", "About"];

function Index() {
  return (
    <main
      className="relative min-h-screen w-full overflow-hidden font-sans text-white"
      style={{
        backgroundColor: "#0a0a0a",
        backgroundImage:
          "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.03) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.03) 0%, transparent 50%)",
      }}
    >
      {/* Ink splatter accents */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-white opacity-10 blur-3xl" />
        <div className="absolute -bottom-40 -right-20 h-[600px] w-[600px] rounded-full bg-white opacity-5 blur-[120px]" />
      </div>

      {/* Name tag */}
      <div className="absolute left-8 top-8 z-50">
        <div
          className="-rotate-1 transform bg-kraft px-6 py-3 shadow-xl"
          style={{
            clipPath:
              "polygon(0% 5%, 5% 0%, 95% 2%, 100% 8%, 98% 92%, 100% 100%, 5% 98%, 0% 90%)",
          }}
        >
          <h1 className="font-mono text-lg font-bold leading-none tracking-tight text-ink-dark">
            EMMANUEL RAYAN DAKA
          </h1>
          <div className="my-1 h-px bg-ink-dark/20" />
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-dark">
            Poet · Author · Journalist · Broadcaster
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="absolute right-12 top-12 z-40 hidden space-x-8 text-[11px] font-bold uppercase tracking-[0.3em] text-white/70 md:flex">
        {navLinks.map((label) => (
          <a
            key={label}
            href={`#${label.toLowerCase().replace(/\s+/g, "-")}`}
            className="transition-colors hover:text-white"
          >
            {label}
          </a>
        ))}
      </nav>

      <section className="relative flex min-h-screen flex-col items-center justify-center px-4 py-20">
        {/* Vertical side text */}
        <div
          className="absolute right-8 top-1/2 -translate-y-1/2 rotate-180 font-mono text-[10px] uppercase tracking-[0.5em] text-white/30"
          style={{ writingMode: "vertical-rl" }}
        >
          YANS LOUNGE © 2026
        </div>

        {/* Photo strip */}
        <div className="relative flex h-[60vh] w-full max-w-6xl items-center justify-center gap-2 md:h-[70vh] md:gap-4">
          <h2 className="pointer-events-none absolute z-30 select-none font-display text-7xl leading-none tracking-tighter text-white mix-blend-difference md:text-[12rem] lg:text-[16rem]">
            MUYAN
            <br />
            COLLECTION
          </h2>

          {tiles.map((t) => (
            <div
              key={t.label}
              className={`h-full flex-1 -skew-x-12 transform overflow-hidden ${t.offset}`}
            >
              <img
                src={t.src}
                alt={t.label}
                width={600}
                height={1200}
                loading="lazy"
                className="h-full w-full skew-x-12 scale-150 transform object-cover"
              />
            </div>
          ))}
        </div>

        {/* Tagline */}
        <div className="z-40 mt-16 max-w-xl text-center">
          <p className="text-sm font-light leading-relaxed text-white/60 md:text-lg">
            These are words carved from quiet places — am just a Zambian poet
            and journalist writing the things we rarely say out loud.
          </p>
          <div className="mt-8 flex justify-center">
            <div className="h-12 w-px bg-gradient-to-b from-white/40 to-transparent" />
          </div>
        </div>
      </section>

      <footer className="flex flex-col items-end justify-between gap-8 border-t border-white/5 p-12 md:flex-row">
        <div>
          <span className="mb-2 block font-mono text-[9px] uppercase tracking-widest text-white/30">
            Currently Residing
          </span>
          <span className="text-sm uppercase tracking-widest">
            Lusaka, Zambia — Tokyo, Japan
          </span>
        </div>
        <div className="text-right">
          <a
            href="#enter"
            className="inline-block cursor-pointer bg-white/5 px-6 py-2 transition-colors hover:bg-white/10"
            style={{
              clipPath:
                "polygon(0% 5%, 5% 0%, 95% 2%, 100% 8%, 98% 92%, 100% 100%, 5% 98%, 0% 90%)",
            }}
          >
            <span className="font-mono text-xs uppercase tracking-tighter">
              Enter the Lounge →
            </span>
          </a>
        </div>
      </footer>
    </main>
  );
}
