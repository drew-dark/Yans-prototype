// Shared media helpers so every gallery, reader and viewer in the app agrees
// on what a URL is: an uploaded file, a direct video, or an embeddable link.

export const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|avif|svg|bmp|tiff?)(\?.*)?$/i;
export const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|ogv|ogg|mkv|avi)(\?.*)?$/i;
export const AUDIO_EXT_RE = /\.(mp3|wav|m4a|aac|flac|oga)(\?.*)?$/i;

export type MediaKind = "image" | "video" | "embed" | "audio" | "other";

/** YouTube / Vimeo / Dailymotion / Loom → canonical iframe embed URL. */
export function getEmbedUrl(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url, typeof window !== "undefined" ? window.location.origin : "https://x.dev");
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      if (u.pathname.startsWith("/embed/")) return u.toString();
      if (u.pathname.startsWith("/shorts/")) return `https://www.youtube.com/embed/${u.pathname.split("/")[2]}`;
      const v = u.searchParams.get("v");
      return v ? `https://www.youtube.com/embed/${v}` : null;
    }
    if (host.endsWith("vimeo.com")) {
      if (host.startsWith("player.")) return u.toString();
      const id = u.pathname.split("/").filter(Boolean)[0];
      return /^\d+$/.test(id ?? "") ? `https://player.vimeo.com/video/${id}` : null;
    }
    if (host.endsWith("dailymotion.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://www.dailymotion.com/embed/video/${id}` : null;
    }
    if (host === "dai.ly") {
      const id = u.pathname.slice(1);
      return id ? `https://www.dailymotion.com/embed/video/${id}` : null;
    }
    if (host.endsWith("loom.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://www.loom.com/embed/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function isEmbedUrl(url: string): boolean {
  return getEmbedUrl(url) !== null;
}

export function isVideoUrl(url: string): boolean {
  if (!url) return false;
  return VIDEO_EXT_RE.test(url) || isEmbedUrl(url) || /\/video\//i.test(url) && VIDEO_EXT_RE.test(url);
}

export function isImageUrl(url: string): boolean {
  return !!url && IMAGE_EXT_RE.test(url);
}

export function isAudioUrl(url: string): boolean {
  return !!url && AUDIO_EXT_RE.test(url);
}

/** Best-effort classification used by grids, viewers and the markdown reader. */
export function mediaKind(url: string): MediaKind {
  if (!url) return "other";
  if (isEmbedUrl(url)) return "embed";
  if (VIDEO_EXT_RE.test(url)) return "video";
  if (AUDIO_EXT_RE.test(url)) return "audio";
  if (IMAGE_EXT_RE.test(url)) return "image";
  return "image"; // uploads without an extension are most often images
}

/** True for anything that should open in the video player rather than the image viewer. */
export function isPlayable(url: string): boolean {
  const k = mediaKind(url);
  return k === "video" || k === "embed";
}

/** Static thumbnail for an embeddable provider, when one exists. */
export function getEmbedThumbnail(url: string): string | null {
  const embed = getEmbedUrl(url);
  if (!embed) return null;
  const yt = embed.match(/youtube(?:-nocookie)?\.com\/embed\/([^/?#]+)/);
  if (yt) return `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg`;
  return null;
}

export function mimeTypeFor(url: string): string | undefined {
  const m = url.match(VIDEO_EXT_RE);
  if (!m) return undefined;
  const ext = m[1].toLowerCase();
  if (ext === "mp4" || ext === "m4v") return "video/mp4";
  if (ext === "webm") return "video/webm";
  if (ext === "ogv" || ext === "ogg") return "video/ogg";
  if (ext === "mov") return "video/quicktime";
  return undefined;
}
