-- =========================================================
-- Reactions: lightweight emoji reactions on any content_kind
-- (stories, diaries, gallery photos, dear_today, footprints).
-- Counts are public; reacting requires an account, same as
-- bookmarks and comments.
-- =========================================================
CREATE TABLE public.reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type public.content_kind NOT NULL,
  content_id uuid NOT NULL,
  emoji text NOT NULL CHECK (emoji IN ('👍', '❤️', '🔥', '😂', '😮', '🙏')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, content_type, content_id, emoji)
);

GRANT SELECT ON public.reactions TO anon;
GRANT SELECT, INSERT, DELETE ON public.reactions TO authenticated;
GRANT ALL ON public.reactions TO service_role;

ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- Counts need to be visible to everyone, signed in or not.
CREATE POLICY "reactions public read"
  ON public.reactions FOR SELECT
  USING (true);

CREATE POLICY "reactions owner insert"
  ON public.reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reactions owner delete"
  ON public.reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_reactions_content ON public.reactions (content_type, content_id);
