## Build the homepage (Raw Editorial Grunge)

Port the selected prototype to the TanStack Start project as the home route (`/`). This is a single-page homepage build — routes for Gallery, Gaijin Diaries, Stories, Shop, About are nav links only for now (can be built out later).

### Design tokens → `src/styles.css`
Carry the prototype's tokens verbatim into the project's `:root` / `@theme inline`:
- `--ink-dark: #0a0a0a` (page background)
- `--kraft: #c5a880` and `--kraft-dark: #a38965` (name tag / CTA)
- Fonts: Anton (display), Courier Prime (mono), Inter (sans) — loaded via `<link>` in `__root.tsx` head (Tailwind v4 rule: no remote `@import` in styles.css)
- Register `--font-display`, `--font-mono`, `--font-sans` in `@theme inline`
- Keep the existing shadcn semantic tokens; add these alongside

### Head metadata → `src/routes/__root.tsx`
Replace placeholder title/description with real values:
- Title: "Emmanuel Rayan Daka — Poet · Author · Journalist · Broadcaster"
- Description, og:title, og:description, twitter:card to match
- Add Google Fonts `<link>` tags to `links`

### Home route → `src/routes/index.tsx`
Replace the placeholder with the full hero:
1. Fixed marbled dark background with soft white blur splatter accents (top-left + bottom-right)
2. Kraft-taped name tag (top-left, rotated -1deg, `clip-path` torn edge)
3. Top-right nav: Gallery · Gaijin Diaries · Stories · Shop · About (anchor links for now)
4. Vertical "YANS LOUNGE © 2026" side text (right, rotated)
5. Photo strip: 5 slanted parallelogram tiles (`-skew-x-12` wrappers, inner `skew-x-12 scale-150` to keep imagery upright), staggered vertical offsets (`mt-12`, `-mt-8`, `mt-20`, `-mt-16`)
6. Massive "MUYAN COLLECTION" headline overlaid on the strip using Anton + `mix-blend-difference`
7. Tagline block below with hairline divider
8. Footer: "Currently Residing — Lusaka, Zambia · Tokyo, Japan" left; kraft-taped "Enter the Lounge →" CTA right

### Images
The prototype has 5 `data-lov-image-placeholder` tiles. Generate each with `imagegen--generate_image` (fast tier) at 600×1200, save to `src/assets/`, import into the route:
1. Moody portrait, Zambian man, soft window light, cinematic
2. Broadcast TV studio lights + cameras
3. Overhead Zambian food platter, vibrant
4. Handwritten poem on aged parchment, ink stains
5. Dark stage, single mic under a spotlight

### Fix the current build error
The failed `build:dev` output is truncated to a Vite internal stack — the actual error message got cut. First step in build mode: run `bun run build:dev` to capture the real error, then fix before shipping the redesign. Most likely a stale reference from a prior turn; a clean home-route rewrite should resolve it.

### Out of scope (this turn)
- Actual Gallery / Stories / Shop / About / Gaijin Diaries route pages
- Any backend, CMS, or auth
- Mobile-specific redesign beyond the responsive fallbacks in the prototype

### Files touched
- `src/styles.css` — add tokens + font vars
- `src/routes/__root.tsx` — head metadata + font `<link>`s
- `src/routes/index.tsx` — full rewrite
- `src/assets/muyan-*.jpg` × 5 — generated images
