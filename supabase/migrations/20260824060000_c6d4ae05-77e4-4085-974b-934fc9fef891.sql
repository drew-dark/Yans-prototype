-- Newsletter confirmation + unsubscribe, via unguessable tokens rather than
-- exposing the table to anon SELECT/UPDATE. Both actions are performed by
-- narrowly-scoped SECURITY DEFINER functions, callable by anyone holding the
-- right link, without granting broad table access.

ALTER TABLE public.newsletter_subscribers
  ADD COLUMN confirm_token TEXT,
  ADD COLUMN confirm_token_expires_at TIMESTAMPTZ,
  ADD COLUMN unsubscribe_token TEXT;

-- Every existing row needs an unsubscribe token too, not just new ones.
UPDATE public.newsletter_subscribers
SET unsubscribe_token = encode(gen_random_bytes(24), 'hex')
WHERE unsubscribe_token IS NULL;

ALTER TABLE public.newsletter_subscribers
  ALTER COLUMN unsubscribe_token SET NOT NULL,
  ADD CONSTRAINT newsletter_subscribers_unsubscribe_token_key UNIQUE (unsubscribe_token);

CREATE UNIQUE INDEX idx_newsletter_subscribers_confirm_token
  ON public.newsletter_subscribers(confirm_token)
  WHERE confirm_token IS NOT NULL;

-- The INSERT policy is (necessarily) open to anon with WITH CHECK (true), so
-- nothing stops a client from trying to insert confirmed = true directly.
-- Force every new row to start unconfirmed with a fresh token regardless of
-- what the client sent — confirmation can only happen through
-- confirm_newsletter_subscriber() below.
CREATE OR REPLACE FUNCTION public.tg_newsletter_subscriber_defaults()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.confirmed := false;
  NEW.confirmed_at := NULL;
  NEW.confirm_token := encode(gen_random_bytes(24), 'hex');
  NEW.confirm_token_expires_at := now() + interval '7 days';
  NEW.unsubscribe_token := encode(gen_random_bytes(24), 'hex');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_newsletter_subscriber_defaults
  BEFORE INSERT ON public.newsletter_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.tg_newsletter_subscriber_defaults();

CREATE OR REPLACE FUNCTION public.confirm_newsletter_subscriber(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated int;
BEGIN
  UPDATE public.newsletter_subscribers
  SET confirmed = true,
      confirmed_at = now(),
      confirm_token = NULL,
      confirm_token_expires_at = NULL
  WHERE confirm_token = p_token
    AND confirmed = false
    AND confirm_token_expires_at > now();
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.unsubscribe_newsletter_subscriber(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated int;
BEGIN
  UPDATE public.newsletter_subscribers
  SET unsubscribed_at = now()
  WHERE unsubscribe_token = p_token
    AND unsubscribed_at IS NULL;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

-- Callable by anyone with a link — not gated behind a role, and each
-- function only ever touches the single row matching its own token.
GRANT EXECUTE ON FUNCTION public.confirm_newsletter_subscriber(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unsubscribe_newsletter_subscriber(text) TO anon, authenticated;
