
-- Collections → Volumes → Seasons taxonomy for stories and diary entries.
-- Chapter and Part are captured as fields on the entries themselves.

CREATE TABLE public.collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.collections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT ALL ON public.collections TO service_role;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public reads collections" ON public.collections FOR SELECT TO public USING (true);
CREATE POLICY "admins write collections" ON public.collections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_collections_updated BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.volumes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (collection_id, slug)
);
GRANT SELECT ON public.volumes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volumes TO authenticated;
GRANT ALL ON public.volumes TO service_role;
ALTER TABLE public.volumes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public reads volumes" ON public.volumes FOR SELECT TO public USING (true);
CREATE POLICY "admins write volumes" ON public.volumes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_volumes_updated BEFORE UPDATE ON public.volumes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX volumes_collection_idx ON public.volumes(collection_id, sort_order);

CREATE TABLE public.seasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  volume_id UUID NOT NULL REFERENCES public.volumes(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (volume_id, slug)
);
GRANT SELECT ON public.seasons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seasons TO authenticated;
GRANT ALL ON public.seasons TO service_role;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public reads seasons" ON public.seasons FOR SELECT TO public USING (true);
CREATE POLICY "admins write seasons" ON public.seasons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_seasons_updated BEFORE UPDATE ON public.seasons
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX seasons_volume_idx ON public.seasons(volume_id, sort_order);

-- Attach taxonomy + chapter/part fields to stories
ALTER TABLE public.stories
  ADD COLUMN collection_id UUID REFERENCES public.collections(id) ON DELETE SET NULL,
  ADD COLUMN volume_id UUID REFERENCES public.volumes(id) ON DELETE SET NULL,
  ADD COLUMN season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
  ADD COLUMN chapter_number NUMERIC,
  ADD COLUMN chapter_title TEXT,
  ADD COLUMN part_number NUMERIC,
  ADD COLUMN part_title TEXT;
CREATE INDEX stories_taxonomy_idx ON public.stories(collection_id, volume_id, season_id, chapter_number, part_number);

-- Attach taxonomy + chapter/part fields to diary_entries
ALTER TABLE public.diary_entries
  ADD COLUMN collection_id UUID REFERENCES public.collections(id) ON DELETE SET NULL,
  ADD COLUMN volume_id UUID REFERENCES public.volumes(id) ON DELETE SET NULL,
  ADD COLUMN season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
  ADD COLUMN chapter_number NUMERIC,
  ADD COLUMN chapter_title TEXT,
  ADD COLUMN part_number NUMERIC,
  ADD COLUMN part_title TEXT;
CREATE INDEX diary_taxonomy_idx ON public.diary_entries(collection_id, volume_id, season_id, chapter_number, part_number);
