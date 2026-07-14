import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type MediaItem =
  | { kind: "image"; src: string; alt?: string; caption?: string }
  | { kind: "video"; src: string; poster?: string; caption?: string };

type Ctx = { open: (item: MediaItem) => void };
const MediaViewerCtx = createContext<Ctx | null>(null);

export function useMediaViewer() {
  const ctx = useContext(MediaViewerCtx);
  if (!ctx) throw new Error("useMediaViewer must be used within <MediaViewerProvider>");
  return ctx;
}

export function MediaViewerProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<MediaItem | null>(null);
  const open = useCallback((i: MediaItem) => setItem(i), []);
  const close = useCallback(() => setItem(null), []);

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [item, close]);

  return (
    <MediaViewerCtx.Provider value={{ open }}>
      {children}
      {item && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={item.kind === "image" ? item.alt ?? "Image" : "Video"}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4"
          onClick={close}
        >
          <div className="relative max-h-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
            {item.kind === "image" ? (
              <img
                src={item.src}
                alt={item.alt ?? ""}
                className="max-h-[85vh] w-auto object-contain"
              />
            ) : (
              <VideoPlayer src={item.src} poster={item.poster} autoPlay />
            )}
            {item.caption && (
              <p className="mt-4 text-center font-mono text-xs uppercase tracking-widest text-white/70">
                {item.caption}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close viewer"
            className="absolute right-6 top-6 font-mono text-xs uppercase tracking-widest text-white/60 hover:text-white"
          >
            Close ✕
          </button>
        </div>
      )}
    </MediaViewerCtx.Provider>
  );
}

export function VideoPlayer({
  src,
  poster,
  autoPlay = false,
  className = "",
}: {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  className?: string;
}) {
  return (
    <video
      src={src}
      poster={poster}
      controls
      playsInline
      preload="metadata"
      autoPlay={autoPlay}
      className={`max-h-[85vh] w-full bg-black ${className}`}
    />
  );
}

// Renders text body with inline media tokens:
//   ![alt](image-url)   → clickable image (opens viewer)
//   @video(video-url)   → inline video player
// Any bare http(s) URL ending in an image or video extension is also detected.
const IMG_EXT = /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i;
const VID_EXT = /\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i;

export function RichBody({ text, className = "" }: { text: string; className?: string }) {
  const { open } = useMediaViewer();
  const lines = text.split(/\n/);

  return (
    <div className={className}>
      {lines.map((line, i) => {
        const trimmed = line.trim();

        const md = trimmed.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
        if (md) {
          const [, alt, src] = md;
          return (
            <button
              key={i}
              type="button"
              onClick={() => open({ kind: "image", src, alt, caption: alt || undefined })}
              className="my-6 block w-full overflow-hidden border border-white/10"
            >
              <img src={src} alt={alt} loading="lazy" className="w-full object-cover transition-transform duration-500 hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100" />
            </button>
          );
        }

        const vid = trimmed.match(/^@video\(([^)\s]+)\)$/);
        if (vid) {
          return <VideoPlayer key={i} src={vid[1]} className="my-6 border border-white/10" />;
        }

        if (IMG_EXT.test(trimmed) && /^https?:\/\//.test(trimmed)) {
          return (
            <button
              key={i}
              type="button"
              onClick={() => open({ kind: "image", src: trimmed })}
              className="my-6 block w-full overflow-hidden border border-white/10"
            >
              <img src={trimmed} alt="" loading="lazy" className="w-full object-cover transition-transform duration-500 hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100" />
            </button>
          );
        }

        if (VID_EXT.test(trimmed) && /^https?:\/\//.test(trimmed)) {
          return <VideoPlayer key={i} src={trimmed} className="my-6 border border-white/10" />;
        }

        return (
          <p key={i} className="whitespace-pre-wrap">
            {line || "\u00a0"}
          </p>
        );
      })}
    </div>
  );
}
