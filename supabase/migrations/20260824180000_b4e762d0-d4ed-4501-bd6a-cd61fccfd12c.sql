-- Track the Mux Live Stream backing each show's credentials, so rotating
-- or deleting can clean up the corresponding resource on Mux's side
-- instead of only touching our own row.
ALTER TABLE public.show_stream_keys
  ADD COLUMN mux_live_stream_id TEXT;

-- Lets a show broadcast from somewhere other than Mux hosting: paste the
-- public watch URL from YouTube/Twitch/Facebook (or any other site) and
-- the site embeds or links out to it instead of hosting the stream itself.
ALTER TABLE public.shows
  ADD COLUMN broadcast_kind TEXT NOT NULL DEFAULT 'hosted',
  ADD COLUMN broadcast_source_url TEXT,
  ADD CONSTRAINT shows_broadcast_kind_check
    CHECK (broadcast_kind IN ('hosted', 'youtube', 'twitch', 'facebook', 'external'));
