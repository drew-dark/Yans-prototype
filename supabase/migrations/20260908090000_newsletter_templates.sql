-- Reusable newsletter templates: save a composed issue's subject/body as a
-- starting point for future issues, instead of writing every issue from
-- scratch. Same admin-only bar as newsletter_issues, since a template's
-- body is broadcast content.

CREATE TABLE public.newsletter_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body_html TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage newsletter templates"
  ON public.newsletter_templates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_newsletter_templates_updated_at
  BEFORE UPDATE ON public.newsletter_templates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_newsletter_templates_created_at
  ON public.newsletter_templates(created_at DESC);
