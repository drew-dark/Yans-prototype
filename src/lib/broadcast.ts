export type BroadcastKind = "hosted" | "youtube" | "twitch" | "facebook" | "external";

export const BROADCAST_KINDS: { value: BroadcastKind; label: string; urlHint: string }[] = [
  { value: "hosted", label: "Hosted (Mux)", urlHint: "" },
  { value: "youtube", label: "YouTube", urlHint: "Paste your YouTube watch or live URL" },
  { value: "twitch", label: "Twitch", urlHint: "Paste your Twitch channel URL" },
  { value: "facebook", label: "Facebook", urlHint: "Paste your Facebook video or live URL" },
  {
    value: "external",
    label: "Other site (bridge)",
    urlHint: "Paste the URL where people are already watching — any site",
  },
];

export function parseYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const m = u.pathname.match(/\/(?:live|embed|shorts)\/([\w-]+)/);
      if (m) return m[1];
    }
  } catch {
    /* not a valid URL */
  }
  return null;
}

export function parseTwitchChannel(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("twitch.tv")) return null;
    const channel = u.pathname.split("/").filter(Boolean)[0];
    return channel || null;
  } catch {
    return null;
  }
}

export type ResolvedBroadcast =
  | { type: "hls"; src: string }
  | { type: "iframe"; src: string }
  | { type: "link"; url: string; hostLabel: string };

/**
 * Turns a show's broadcast configuration into something a player component
 * can render. `parentDomain` is required for Twitch embeds only — Twitch
 * rejects embeds unless the `parent` param matches the page's real hostname,
 * so pass `window.location.hostname` from the client (never a guessed
 * constant, since it needs to match dev/preview/production alike).
 */
export function resolveBroadcast(
  kind: BroadcastKind,
  sourceUrl: string | null,
  hlsPlaybackUrl: string | null,
  parentDomain: string,
): ResolvedBroadcast | null {
  if (kind === "hosted") {
    return hlsPlaybackUrl ? { type: "hls", src: hlsPlaybackUrl } : null;
  }
  if (!sourceUrl) return null;

  if (kind === "youtube") {
    const id = parseYouTubeId(sourceUrl);
    return id ? { type: "iframe", src: `https://www.youtube.com/embed/${id}?autoplay=1` } : null;
  }
  if (kind === "twitch") {
    const channel = parseTwitchChannel(sourceUrl);
    return channel
      ? {
          type: "iframe",
          src: `https://player.twitch.tv/?channel=${channel}&parent=${parentDomain}&autoplay=true`,
        }
      : null;
  }
  if (kind === "facebook") {
    return {
      type: "iframe",
      src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(sourceUrl)}&autoplay=1`,
    };
  }
  // "external" — most sites block being iframed at all (X-Frame-Options /
  // CSP), so rather than a broken embed, link out to wherever the person is
  // actually broadcasting.
  let hostLabel = sourceUrl;
  try {
    hostLabel = new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    /* keep the raw string as a fallback label */
  }
  return { type: "link", url: sourceUrl, hostLabel };
}
