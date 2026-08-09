import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getEmbedUrl, isPlayable, mediaKind, mimeTypeFor, IMAGE_EXT_RE } from "@/lib/media";

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

/** Build a viewer item from any URL — uploaded file or pasted link. */
export function mediaItemFor(src: string, caption?: string): MediaItem {
  return isPlayable(src)
    ? { kind: "video", src, caption }
    : { kind: "image", src, alt: caption ?? "", caption };
}

export function MediaViewerProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<MediaItem | null>(null);
  const open = useCallback((i: MediaItem) => {
    // Normalise: an "image" that is actually a video/embed URL still plays.
    setItem(i.kind === "image" && isPlayable(i.src) ? { kind: "video", src: i.src, caption: i.caption } : i);
  }, []);
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
          <div className="relative max-h-full w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
            {item.kind === "image" ? (
              <img
                src={item.src}
                alt={item.alt ?? ""}
                className="mx-auto max-h-[85vh] w-auto object-contain"
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

/**
 * Universal player: uploaded/direct video files play natively, provider links
 * (YouTube, Vimeo, Dailymotion, Loom) play in an embedded frame.
 */
export function VideoPlayer({
  src,
  poster,
  autoPlay = false,
  className = "",
  title = "Video",
}: {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  className?: string;
  title?: string;
}) {
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const embed = getEmbedUrl(src);

  const togglePip = async () => {
    const v = videoRef.current as (HTMLVideoElement & { requestPictureInPicture?: () => Promise<unknown> }) | null;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture?.();
    } catch {
      /* unsupported or blocked */
    }
  };

  const toggleFullscreen = async () => {
    const el = wrapRef.current;
    const v = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (el?.requestFullscreen) await el.requestFullscreen();
      else v?.webkitEnterFullscreen?.();
    } catch {
      /* unsupported */
    }
  };

  if (embed) {
    return (
      <div className={`relative w-full overflow-hidden bg-black ${className}`} style={{ aspectRatio: "16 / 9" }}>
        <iframe
          src={autoPlay ? `${embed}${embed.includes("?") ? "&" : "?"}autoplay=1` : embed}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    );
  }

  if (failed) {
    return (
      <div className={`flex flex-col items-center gap-2 bg-black/60 p-6 text-center ${className}`}>
        <p className="font-mono text-[10px] uppercase tracking-widest text-white/50">Video unavailable here</p>
        <a href={src} target="_blank" rel="noreferrer" className="text-sm text-white underline underline-offset-4 break-all">
          Open video in a new tab
        </a>
      </div>
    );
  }

  return (
    <video
      poster={poster}
      controls
      playsInline
      preload="metadata"
      autoPlay={autoPlay}
      onError={() => setFailed(true)}
      className={`max-h-[85vh] w-full bg-black ${className}`}
    >
      <source src={src} type={mimeTypeFor(src)} />
      Your browser cannot play this video.
    </video>
  );
}

// Renders text body with inline media tokens:
//   ![alt](image-url)   → clickable image (opens viewer)
//   @video(video-url)   → inline video player
// Any bare http(s) URL ending in an image or video extension, or a supported
// video-provider link, is also detected.
const IMG_EXT = IMAGE_EXT_RE;


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

        if (/^https?:\/\//.test(trimmed) && isPlayable(trimmed)) {
          return <VideoPlayer key={i} src={trimmed} className="my-6 border border-white/10" />;
        }

        if (/^https?:\/\//.test(trimmed) && (IMG_EXT.test(trimmed) || mediaKind(trimmed) === "image")) {
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


        return (
          <p key={i} className="whitespace-pre-wrap">
            {line || "\u00a0"}
          </p>
        );
      })}
    </div>
  );
}
