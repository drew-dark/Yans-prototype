CREATE TABLE public.shows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  cover_url text,
  playback_url text,
  status text NOT NULL DEFAULT 'offline',
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  recording_url text,
  published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.show_stream_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id uuid NOT NULL UNIQUE REFERENCES public.shows(id) ON DELETE CASCADE,
  ingest_url text NOT NULL DEFAULT 'rtmp://localhost/live',
  stream_key text NOT NULL DEFAULT encode(gen_random_bytes(20), 'hex'),
  rotated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shows TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shows TO authenticated;
GRANT ALL ON public.shows TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.show_stream_keys TO authenticated;
GRANT ALL ON public.show_stream_keys TO service_role;

ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.show_stream_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published shows"
  ON public.shows FOR SELECT TO anon
  USING (published = true);

CREATE POLICY "Signed-in can view published shows"
  ON public.shows FOR SELECT TO authenticated
  USING (published = true OR public.has_any_role(auth.uid(), ARRAY['admin','editor']::app_role[]));

CREATE POLICY "Staff can insert shows"
  ON public.shows FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','editor']::app_role[]));

CREATE POLICY "Staff can update shows"
  ON public.shows FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','editor']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','editor']::app_role[]));

CREATE POLICY "Staff can delete shows"
  ON public.shows FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','editor']::app_role[]));

CREATE POLICY "Staff can manage stream keys"
  ON public.show_stream_keys FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','editor']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','editor']::app_role[]));

CREATE TRIGGER trg_shows_updated_at BEFORE UPDATE ON public.shows
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_show_stream_keys_updated_at BEFORE UPDATE ON public.show_stream_keys
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();