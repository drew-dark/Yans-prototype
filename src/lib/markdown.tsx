import { Fragment, type ReactNode } from "react";
import { useMediaViewer, VideoPlayer } from "@/components/site/MediaViewer";
import { IMAGE_EXT_RE, isPlayable, mediaKind } from "@/lib/media";

// Small, safe-ish markdown renderer tuned for the site's editor tokens.
// Supported block:  # / ## / ### headings, > blockquote, - / * / 1. lists,
//                   --- rule, ``` fenced code, blank line = paragraph break.
// Supported inline: **bold**, *italic*, _italic_, `code`, [text](url),
//                   ![alt](url) image (opens viewer), @video(url) inline video,
//                   bare http(s) image/video URLs.
// Anything unrecognised falls through as plain text.

const IMG_EXT = IMAGE_EXT_RE;

function renderInline(text: string, keyPrefix = ""): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Tokenise: [text](url) | ![alt](url) | **x** | *x* | _x_ | `x` | bare url
  const re =
    /(!\[([^\]]*)\]\(([^)\s]+)\))|(\[([^\]]+)\]\(([^)\s]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(_([^_]+)_)|(`([^`]+)`)|((?:https?:\/\/)[^\s]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const k = `${keyPrefix}i${i++}`;
    if (m[1]) {
      // inline image → render as small clickable thumb? Keep block image via top-level; inline just shows img
      nodes.push(
        <img
          key={k}
          src={m[3]}
          alt={m[2]}
          loading="lazy"
          className="my-2 inline-block max-h-40 rounded border border-white/10"
        />,
      );
    } else if (m[4]) {
      nodes.push(
        <a key={k} href={m[6]} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-white">
          {m[5]}
        </a>,
      );
    } else if (m[7]) {
      nodes.push(<strong key={k} className="font-semibold text-white">{m[8]}</strong>);
    } else if (m[9]) {
      nodes.push(<em key={k}>{m[10]}</em>);
    } else if (m[11]) {
      nodes.push(<em key={k}>{m[12]}</em>);
    } else if (m[13]) {
      nodes.push(
        <code key={k} className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.85em]">
          {m[14]}
        </code>,
      );
    } else if (m[15]) {
      nodes.push(
        <a key={k} href={m[15]} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-white break-all">
          {m[15]}
        </a>,
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

type Block =
  | { kind: "h"; level: 1 | 2 | 3; text: string }
  | { kind: "p"; text: string }
  | { kind: "quote"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "hr" }
  | { kind: "code"; text: string }
  | { kind: "image"; alt: string; src: string }
  | { kind: "video"; src: string; poster?: string };

function parseBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { kind: "ul" | "ol"; items: string[] } | null = null;
  let inCode = false;
  let code: string[] = [];

  const flushPara = () => {
    if (para.length) {
      blocks.push({ kind: "p", text: para.join(" ") });
      para = [];
    }
  };
  const flushList = () => {
    if (list) { blocks.push(list); list = null; }
  };
  const flushAll = () => { flushPara(); flushList(); };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (inCode) {
      if (line.trim() === "```") { blocks.push({ kind: "code", text: code.join("\n") }); code = []; inCode = false; }
      else code.push(raw);
      continue;
    }
    if (line.trim() === "```") { flushAll(); inCode = true; continue; }

    if (!line.trim()) { flushAll(); continue; }

    // Standalone media tokens
    const img = line.trim().match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    if (img) { flushAll(); blocks.push({ kind: "image", alt: img[1], src: img[2] }); continue; }
    const vid = line.trim().match(/^@video\(([^)]+)\)$/);
    if (vid) {
      flushAll();
      const inner = vid[1].trim();
      const posterMatch = inner.match(/^(\S+)\s*,\s*poster\s*=\s*(\S+)$/);
      if (posterMatch) blocks.push({ kind: "video", src: posterMatch[1], poster: posterMatch[2] });
      else blocks.push({ kind: "video", src: inner.split(/\s|,/)[0] });
      continue;
    }
    const bare = line.trim();
    if (/^https?:\/\//.test(bare) && isPlayable(bare)) { flushAll(); blocks.push({ kind: "video", src: bare }); continue; }
    if (/^https?:\/\//.test(bare) && (IMG_EXT.test(bare) || mediaKind(bare) === "image")) { flushAll(); blocks.push({ kind: "image", alt: "", src: bare }); continue; }

    if (/^---+$/.test(line.trim())) { flushAll(); blocks.push({ kind: "hr" }); continue; }

    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) { flushAll(); blocks.push({ kind: "h", level: h[1].length as 1 | 2 | 3, text: h[2] }); continue; }

    if (/^>\s?/.test(line)) {
      flushList();
      // group consecutive quote lines
      const prev = blocks[blocks.length - 1];
      const text = line.replace(/^>\s?/, "");
      if (prev && prev.kind === "quote") prev.text += " " + text;
      else blocks.push({ kind: "quote", text });
      continue;
    }

    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ul) {
      flushPara();
      if (!list || list.kind !== "ul") { flushList(); list = { kind: "ul", items: [] }; }
      list.items.push(ul[1]);
      continue;
    }
    if (ol) {
      flushPara();
      if (!list || list.kind !== "ol") { flushList(); list = { kind: "ol", items: [] }; }
      list.items.push(ol[1]);
      continue;
    }

    flushList();
    para.push(line);
  }
  flushAll();
  if (inCode && code.length) blocks.push({ kind: "code", text: code.join("\n") });
  return blocks;
}

export function Markdown({
  text,
  className = "",
  dropCap = false,
}: {
  text: string;
  className?: string;
  dropCap?: boolean;
}) {
  const { open } = useMediaViewer();
  const blocks = parseBlocks(text || "");
  let firstPara = true;

  return (
    <div className={className}>
      {blocks.map((b, i) => {
        switch (b.kind) {
          case "h": {
            const Tag = (`h${b.level + 1}` as "h2" | "h3" | "h4");
            const cls =
              b.level === 1
                ? "mt-10 font-display text-3xl uppercase tracking-tight text-white md:text-4xl"
                : b.level === 2
                ? "mt-8 font-display text-2xl uppercase tracking-tight text-white md:text-3xl"
                : "mt-6 font-mono text-xs uppercase tracking-widest text-white/70";
            return <Tag key={i} className={cls}>{renderInline(b.text, `${i}-`)}</Tag>;
          }
          case "p": {
            const first = firstPara && dropCap;
            firstPara = false;
            return (
              <p
                key={i}
                className={`mt-5 leading-relaxed ${first ? "first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:font-display first-letter:text-6xl first-letter:leading-[0.85] first-letter:uppercase first-letter:text-white" : ""}`}
              >
                {renderInline(b.text, `${i}-`)}
              </p>
            );
          }
          case "quote":
            return (
              <blockquote key={i} className="my-8 border-l-2 border-white/40 pl-5 font-display text-xl italic tracking-tight text-white/85 md:text-2xl">
                {renderInline(b.text, `${i}-`)}
              </blockquote>
            );
          case "ul":
            return (
              <ul key={i} className="mt-5 list-disc space-y-1 pl-6 marker:text-white/40">
                {b.items.map((t, j) => <li key={j}>{renderInline(t, `${i}-${j}-`)}</li>)}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="mt-5 list-decimal space-y-1 pl-6 marker:text-white/40">
                {b.items.map((t, j) => <li key={j}>{renderInline(t, `${i}-${j}-`)}</li>)}
              </ol>
            );
          case "hr":
            return <hr key={i} className="my-10 border-white/10" />;
          case "code":
            return (
              <pre key={i} className="my-6 overflow-x-auto rounded border border-white/10 bg-black/60 p-4 font-mono text-xs text-white/80">
                <code>{b.text}</code>
              </pre>
            );
          case "image":
            return (
              <button
                key={i}
                type="button"
                onClick={() => open({ kind: "image", src: b.src, alt: b.alt, caption: b.alt || undefined })}
                className="group my-8 block w-full overflow-hidden border border-white/10"
                aria-label={b.alt || "Open image"}
              >
                <img
                  src={b.src}
                  alt={b.alt}
                  loading="lazy"
                  className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
                {b.alt && (
                  <span className="block bg-black/70 p-2 text-center font-mono text-[10px] uppercase tracking-widest text-white/60">
                    {b.alt}
                  </span>
                )}
              </button>
            );
          case "video":
            return <VideoPlayer key={i} src={b.src} poster={b.poster} className="my-8 border border-white/10" />;
          default:
            return <Fragment key={i} />;
        }
      })}
    </div>
  );
}

export function readingTimeMinutes(text: string | null | undefined): number {
  if (!text) return 0;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}
