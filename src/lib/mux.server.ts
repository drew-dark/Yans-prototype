// Server-only. Never import this from a route file or *.functions.ts at the
// top level — those ship to the client bundle. Load it inside a server
// function handler instead, e.g.:
//   const { createLiveStream } = await import("@/lib/mux.server");

const MUX_API_BASE = "https://api.mux.com/video/v1";

// Fixed for every Mux live stream — the stream key (not this URL) is what
// identifies which broadcast an RTMP connection belongs to.
const MUX_RTMP_INGEST_URL = "rtmp://global-live.mux.com:5222/app";

type LiveStream = {
  id: string;
  ingestUrl: string;
  streamKey: string;
  playbackUrl: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} environment variable.`);
  return value;
}

function authHeader(): string {
  const tokenId = requireEnv("MUX_TOKEN_ID");
  const tokenSecret = requireEnv("MUX_TOKEN_SECRET");
  // Mux uses HTTP Basic Auth (token ID + secret), not a bearer token.
  return `Basic ${btoa(`${tokenId}:${tokenSecret}`)}`;
}

async function muxFetch(path: string, init: RequestInit): Promise<unknown> {
  const res = await fetch(`${MUX_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  // DELETE (and some other calls) return 204 No Content — no body to parse.
  const text = await res.text();
  const body: unknown = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(
      `Mux API error (${res.status}): ${JSON.stringify((body as { error?: unknown } | null)?.error ?? body)}`,
    );
  }
  return (body as { data?: unknown } | null)?.data;
}

/** Creates a new Mux Live Stream — real RTMP ingest credentials, ready for OBS. */
export async function createLiveStream(): Promise<LiveStream> {
  const result = (await muxFetch("/live-streams", {
    method: "POST",
    body: JSON.stringify({
      playback_policies: ["public"],
      new_asset_settings: { playback_policies: ["public"] },
    }),
  })) as { id: string; stream_key: string; playback_ids: { id: string; policy: string }[] };

  const playbackId = result.playback_ids[0]?.id;
  if (!playbackId) throw new Error("Mux did not return a playback ID for the new live stream.");

  return {
    id: result.id,
    ingestUrl: MUX_RTMP_INGEST_URL,
    streamKey: result.stream_key,
    playbackUrl: `https://stream.mux.com/${playbackId}.m3u8`,
  };
}

/** Deletes a Live Stream on Mux's side — call this before provisioning a replacement. */
export async function deleteLiveStream(id: string): Promise<void> {
  try {
    await muxFetch(`/live-streams/${id}`, { method: "DELETE" });
  } catch (err) {
    // Already gone, or never existed — fine to proceed with provisioning a
    // fresh one either way. Only log, don't block on cleanup failures.
    console.error("[mux] delete failed (continuing):", err);
  }
}
