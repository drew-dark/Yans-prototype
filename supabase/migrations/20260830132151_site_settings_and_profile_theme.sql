-- =========================================================
-- Site-wide default theme (admin-controlled, applies to every
-- visitor who hasn't picked their own) + a personal override
-- once a visitor has an account.
-- =========================================================

-- Singleton settings row. Public read (every visitor needs it to
-- render the right theme before anything else), admin-only write.
CREATE TABLE public.site_settings (
  id text PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  default_theme text NOT NULL DEFAULT 'kraft',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.site_settings (id, default_theme) VALUES ('default', 'kraft');

GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site settings public read"
  ON public.site_settings FOR SELECT
  USING (true);

CREATE POLICY "site settings admin write"
  ON public.site_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Personal theme override. Null = "use the site default". Covered by
-- the existing "profiles owner update" RLS policy, no new policy
-- needed.
ALTER TABLE public.profiles ADD COLUMN theme text;
