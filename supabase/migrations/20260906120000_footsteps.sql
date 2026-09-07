-- Footsteps feature: public per-user micro-page.

-- profiles has no username today (only user_id) — needed for a clean
-- public URL (/footsteps/$username instead of /footsteps/$uuid).
ALTER TABLE public.profiles
  ADD COLUMN username text UNIQUE,
  ADD COLUMN footsteps_visible boolean NOT NULL DEFAULT true;

-- Existing "profiles public read" policy (USING (true)) already covers
-- reads of the new columns — no RLS change needed there.

-- Reflections: a long-form, user-owned post about a piece of content
-- (or standalone), distinct from a comment — shows on the author's
-- Footsteps timeline.
CREATE TABLE public.reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id uuid,
  content_type public.content_kind,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public reads reflections"
  ON public.reflections FOR SELECT
  USING (true);

CREATE POLICY "user writes own reflections"
  ON public.reflections FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_reflections_updated_at
  BEFORE UPDATE ON public.reflections
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_reflections_user_created
  ON public.reflections (user_id, created_at DESC);

-- Content views ("what they read") — dedup'd per user+content.
CREATE TABLE public.content_views (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id uuid NOT NULL,
  content_type public.content_kind NOT NULL,
  first_viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, content_id, content_type)
);

ALTER TABLE public.content_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public reads content_views"
  ON public.content_views FOR SELECT
  USING (true);

CREATE POLICY "user logs own view"
  ON public.content_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_content_views_user
  ON public.content_views (user_id, first_viewed_at DESC);
