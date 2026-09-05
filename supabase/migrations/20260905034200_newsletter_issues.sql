-- Newsletter broadcasts: one row per composed/sent issue, so admins have a
-- history of what went out and to how many people. Sending itself always
-- happens through a server function using the service role (RESEND_API_KEY
-- never reaches the client) — this table is written by that server function
-- and read directly by the admin UI, same split as newsletter_subscribers.

CREATE TABLE public.newsletter_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sending', 'sent', 'partial_failure', 'failed')),
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.newsletter_issues TO authenticated;
GRANT ALL ON public.newsletter_issues TO service_role;

ALTER TABLE public.newsletter_issues ENABLE ROW LEVEL SECURITY;

-- Admin-only in both directions — same bar as reading/managing the
-- subscriber list itself, since an issue's body_html is broadcast content
-- and its counts reveal list size.
CREATE POLICY "Admins can view newsletter issues"
  ON public.newsletter_issues FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage newsletter issues"
  ON public.newsletter_issues FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_newsletter_issues_created_at ON public.newsletter_issues(created_at DESC);
