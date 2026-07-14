
CREATE TABLE public.hero_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  alt TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.hero_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hero_images TO authenticated;
GRANT ALL ON public.hero_images TO service_role;

ALTER TABLE public.hero_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published hero images"
  ON public.hero_images FOR SELECT
  USING (published = true);

CREATE POLICY "Admins can view all hero images"
  ON public.hero_images FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert hero images"
  ON public.hero_images FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update hero images"
  ON public.hero_images FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete hero images"
  ON public.hero_images FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER hero_images_set_updated_at
  BEFORE UPDATE ON public.hero_images
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
