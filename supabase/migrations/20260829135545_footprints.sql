-- =========================================================
-- Footprints: a portfolio of past work (news appearances,
-- creator videos, other projects) sourced from anywhere —
-- direct upload, YouTube, Google Drive, or a plain link.
-- =========================================================
CREATE TABLE public.footprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'project', -- 'news' | 'video' | 'project' | other free text
  role_or_outlet text,                      -- e.g. "NHK World", "Solo project", "Client: Acme"
  description text,
  occurred_on date,                         -- when the work happened / aired / shipped
  media_url text,                           -- uploaded file, YouTube link, or Google Drive link
  external_url text,                        -- optional "read/watch the original" link
  cover_url text,                           -- optional thumbnail override
  tags text[] NOT NULL DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.footprints TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.footprints TO authenticated;
GRANT ALL ON public.footprints TO service_role;

ALTER TABLE public.footprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public reads published footprints"
  ON public.footprints FOR SELECT
  USING (published = true);

CREATE POLICY "staff read all footprints"
  ON public.footprints FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','editor']::app_role[]));

CREATE POLICY "staff write footprints"
  ON public.footprints FOR ALL
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','editor']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','editor']::app_role[]));

CREATE TRIGGER trg_footprints_updated_at
  BEFORE UPDATE ON public.footprints
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_footprints_published_sort
  ON public.footprints (published, sort_order);
