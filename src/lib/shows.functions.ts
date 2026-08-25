import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

// Matches the has_any_role(['admin','editor']) check already used in this
// table's own RLS policies (see the shows/show_stream_keys migration) —
// same people who can manage a show should be able to provision its
// streaming credentials.
async function assertShowsStaff(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase.rpc("has_any_role", {
    _user_id: userId,
    _roles: ["admin", "editor"],
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

const provisionInput = z.object({
  showId: z.string().uuid(),
});

/**
 * Provisions (or re-provisions, for "rotate") a real Mux Live Stream for a
 * show: a live RTMP ingest URL + stream key for OBS, and an HLS playback
 * URL for the site. If the show already has credentials, the old Mux Live
 * Stream is deleted first so rotating doesn't leave orphaned resources
 * (and their minutes-delivered billing) behind.
 */
export const provisionLiveInput = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { showId: string }) => provisionInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertShowsStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createLiveStream, deleteLiveStream } = await import("@/lib/mux.server");

    const { data: existing } = await supabaseAdmin
      .from("show_stream_keys")
      .select("id, mux_live_stream_id")
      .eq("show_id", data.showId)
      .maybeSingle();

    if (existing?.mux_live_stream_id) {
      await deleteLiveStream(existing.mux_live_stream_id);
    }

    const stream = await createLiveStream();

    if (existing) {
      const { error } = await supabaseAdmin
        .from("show_stream_keys")
        .update({
          ingest_url: stream.ingestUrl,
          stream_key: stream.streamKey,
          mux_live_stream_id: stream.id,
          rotated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("show_stream_keys").insert({
        show_id: data.showId,
        ingest_url: stream.ingestUrl,
        stream_key: stream.streamKey,
        mux_live_stream_id: stream.id,
      });
      if (error) throw new Error(error.message);
    }

    const { error: showErr } = await supabaseAdmin
      .from("shows")
      .update({ playback_url: stream.playbackUrl })
      .eq("id", data.showId);
    if (showErr) throw new Error(showErr.message);

    return {
      ingestUrl: stream.ingestUrl,
      streamKey: stream.streamKey,
      playbackUrl: stream.playbackUrl,
    };
  });
