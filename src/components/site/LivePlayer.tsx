import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Plays an HLS (.m3u8) live stream or recording. Uses native HLS where the
 * browser supports it (Safari/iOS) and hls.js everywhere else. hls.js is
 * imported lazily inside an effect so it never runs during SSR.
 */
export function LivePlayer({
  src,
  poster,
  className = "",
  live = false,
}: {
  src: string;
  poster?: string;
  className?: string;
  live?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    setError(null);

    const isHls = /\.m3u8(\?.*)?$/i.test(src);
    if (!isHls) {
      video.src = src;
      return;
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return;
    }

    let destroy: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      const { default: Hls } = await import("hls.js");
      if (cancelled) return;
      if (!Hls.isSupported()) {
        setError(t("broadcast.browserCantPlay"));
        return;
      }
      const hls = new Hls({ lowLatencyMode: live, enableWorker: true });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) setError(t("broadcast.streamUnavailable"));
      });
      destroy = () => hls.destroy();
    })();

    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [src, live, t]);

  const togglePip = async () => {
    const v = videoRef.current as
      (HTMLVideoElement & { requestPictureInPicture?: () => Promise<unknown> }) | null;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture?.();
    } catch {
      /* unsupported */
    }
  };

  const toggleFullscreen = async () => {
    const el = wrapRef.current;
    const v = videoRef.current as
      (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (el?.requestFullscreen) await el.requestFullscreen();
      else v?.webkitEnterFullscreen?.();
    } catch {
      /* unsupported */
    }
  };

  return (
    <div ref={wrapRef} className={`group/player relative bg-black ${className}`}>
      <video
        ref={videoRef}
        poster={poster}
        controls
        playsInline
        autoPlay={live}
        muted={live}
        preload="metadata"
        className="aspect-video w-full bg-black"
      />
      <div className="pointer-events-none absolute right-2 top-2 flex gap-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover/player:opacity-100 motion-reduce:transition-none">
        <button
          type="button"
          onClick={togglePip}
          aria-label={t("media.pip")}
          className="pointer-events-auto rounded bg-black/70 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-white/80 hover:text-white"
        >
          PiP
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={t("media.fullscreen")}
          className="pointer-events-auto rounded bg-black/70 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-white/80 hover:text-white"
        >
          ⛶
        </button>
      </div>
      {live && (
        <span className="pointer-events-none absolute left-2 top-2 rounded bg-red-600/90 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-white">
          ● {t("broadcast.live")}
        </span>
      )}
      {error && (
        <p className="absolute inset-x-0 bottom-0 bg-black/80 p-3 text-center font-mono text-[10px] uppercase tracking-widest text-white/70">
          {error}
        </p>
      )}
    </div>
  );
}
