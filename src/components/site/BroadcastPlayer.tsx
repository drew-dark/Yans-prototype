import { useEffect, useState } from "react";
import { LivePlayer } from "@/components/site/LivePlayer";
import { resolveBroadcast, type BroadcastKind } from "@/lib/broadcast";

export function BroadcastPlayer({
  kind,
  sourceUrl,
  playbackUrl,
  poster,
  live = false,
}: {
  kind: BroadcastKind;
  sourceUrl: string | null;
  playbackUrl: string | null;
  poster?: string;
  live?: boolean;
}) {
  // Twitch embeds require `parent` to match the real hostname the page is
  // served from — only known once mounted in a browser.
  const [hostname, setHostname] = useState("");
  useEffect(() => setHostname(window.location.hostname), []);

  const resolved = resolveBroadcast(kind, sourceUrl, playbackUrl, hostname);

  if (!resolved) {
    return (
      <div className="flex aspect-video w-full items-center justify-center bg-white/5 font-mono text-[10px] uppercase tracking-widest text-white/40">
        Stream source not configured
      </div>
    );
  }

  if (resolved.type === "hls") {
    return <LivePlayer src={resolved.src} poster={poster} live={live} />;
  }

  if (resolved.type === "iframe") {
    // Twitch's parent check needs a real hostname — hold the iframe until
    // we're mounted client-side rather than briefly loading with a blank one.
    if (kind === "twitch" && !hostname) {
      return <div className="aspect-video w-full animate-pulse bg-white/5" />;
    }
    return (
      <div className="relative aspect-video w-full bg-black">
        <iframe
          src={resolved.src}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          title="Live broadcast"
        />
        {live && (
          <span className="pointer-events-none absolute left-2 top-2 rounded bg-red-600/90 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-white">
            ● Live
          </span>
        )}
      </div>
    );
  }

  // Link-out: most sites refuse to be embedded (X-Frame-Options/CSP), so a
  // prominent "watch there" card is more honest than a broken iframe.
  return (
    <a
      href={resolved.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex aspect-video w-full flex-col items-center justify-center gap-3 border border-white/10 bg-black/40 px-6 text-center transition-colors hover:border-kraft/60"
    >
      {live && (
        <span className="rounded bg-red-600/90 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-white">
          ● Live
        </span>
      )}
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
        Broadcasting on
      </p>
      <p className="font-display text-2xl uppercase tracking-tight text-white group-hover:text-kraft">
        {resolved.hostLabel}
      </p>
      <p className="font-mono text-[10px] uppercase tracking-widest text-white/50">Watch there →</p>
    </a>
  );
}
