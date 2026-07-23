
-- Helper: has_any_role
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) TO authenticated, service_role;

-- Content type enum used by bookmarks and comments
DO $$ BEGIN
  CREATE TYPE public.content_kind AS ENUM ('story','diary','collection_item','gallery','dear_today');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles public read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles owner update" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles owner insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- bookmarks
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type public.content_kind NOT NULL,
  content_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, content_type, content_id)
);
GRANT SELECT, INSERT, DELETE ON public.bookmarks TO authenticated;
GRANT ALL ON public.bookmarks TO service_role;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookmarks owner all" ON public.bookmarks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- comments
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type public.content_kind NOT NULL,
  content_id uuid NOT NULL,
  parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  status text NOT NULL DEFAULT 'visible' CHECK (status IN ('visible','hidden')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments public read visible" ON public.comments FOR SELECT
  USING (status = 'visible' OR auth.uid() = user_id OR public.has_any_role(auth.uid(), ARRAY['admin','moderator']::public.app_role[]));
CREATE POLICY "comments auth insert own" ON public.comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments owner update" ON public.comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments owner delete" ON public.comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "comments mod update" ON public.comments FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','moderator']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','moderator']::public.app_role[]));
CREATE POLICY "comments mod delete" ON public.comments FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','moderator']::public.app_role[]));
CREATE TRIGGER comments_updated_at BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX IF NOT EXISTS comments_content_idx ON public.comments (content_type, content_id, created_at DESC);

-- dear_today
CREATE TABLE IF NOT EXISTS public.dear_today (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date date NOT NULL DEFAULT current_date,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  cover_url text,
  body text,
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  volume_id uuid REFERENCES public.volumes(id) ON DELETE SET NULL,
  season_id uuid REFERENCES public.seasons(id) ON DELETE SET NULL,
  chapter_number integer,
  chapter_title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dear_today TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dear_today TO authenticated;
GRANT ALL ON public.dear_today TO service_role;
ALTER TABLE public.dear_today ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dear_today public read published" ON public.dear_today FOR SELECT
  USING (published = true OR auth.uid() = author_id OR public.has_any_role(auth.uid(), ARRAY['admin','editor','moderator']::public.app_role[]));
CREATE POLICY "dear_today staff write" ON public.dear_today FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','editor']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','editor']::public.app_role[]));
CREATE POLICY "dear_today guest_author own" ON public.dear_today FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'guest_author') AND auth.uid() = author_id)
  WITH CHECK (public.has_role(auth.uid(), 'guest_author') AND auth.uid() = author_id);
CREATE TRIGGER dear_today_updated_at BEFORE UPDATE ON public.dear_today
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX IF NOT EXISTS dear_today_pub_date_idx ON public.dear_today (published, entry_date DESC);

-- Signup trigger: create profile + grant reader role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'reader')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles + reader role for existing users
INSERT INTO public.profiles (user_id, display_name)
SELECT id, COALESCE(raw_user_meta_data->>'display_name', split_part(email, '@', 1)) FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
