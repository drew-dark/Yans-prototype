-- =========================================================
-- Collections restructure: Library (/collection) > Collection
-- Home (/collection/$slug) > Entry reader. Entries can mix
-- images, video, audio, a story/text body, and attachments.
--
-- Dear Today keeps its own existing dedicated pages (it's a
-- daily diary, not a curated collection of built entries) but
-- still gets a card in the Library — the frontend special-cases
-- the card's link by slug rather than this needing its own
-- entries here.
-- =========================================================

CREATE TABLE public.collection_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  cover_url text,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  body text,
  sort_order int NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection_id, slug)
);

GRANT SELECT ON public.collection_entries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_entries TO authenticated;
GRANT ALL ON public.collection_entries TO service_role;

ALTER TABLE public.collection_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public reads published collection_entries"
  ON public.collection_entries FOR SELECT
  USING (published = true);

CREATE POLICY "staff read all collection_entries"
  ON public.collection_entries FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins write collection_entries"
  ON public.collection_entries FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_collection_entries_updated_at
  BEFORE UPDATE ON public.collection_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_collection_entries_collection
  ON public.collection_entries (collection_id, published, sort_order);


CREATE TABLE public.collection_entry_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.collection_entries(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('image', 'video', 'audio', 'pdf', 'attachment')),
  url text NOT NULL,
  caption text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.collection_entry_media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_entry_media TO authenticated;
GRANT ALL ON public.collection_entry_media TO service_role;

ALTER TABLE public.collection_entry_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public reads collection_entry_media"
  ON public.collection_entry_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.collection_entries e
      WHERE e.id = entry_id AND e.published = true
    )
  );

CREATE POLICY "staff read all collection_entry_media"
  ON public.collection_entry_media FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins write collection_entry_media"
  ON public.collection_entry_media FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_collection_entry_media_entry
  ON public.collection_entry_media (entry_id, sort_order);


-- Seed the two collections that appear in the Library today.
INSERT INTO public.collections (slug, title, description, sort_order)
VALUES
  ('muyan', 'Muyan Collection', 'Photographs and entries from the Muyan collection.', 0),
  ('dear-today', 'Dear Today', 'A daily diary — small entries kept one day at a time.', 1)
ON CONFLICT (slug) DO NOTHING;
