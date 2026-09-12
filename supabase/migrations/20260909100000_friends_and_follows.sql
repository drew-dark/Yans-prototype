-- Supersedes the earlier RLS-only patch — that one assumed friend_requests
-- already existed (the Supabase linter warning implied a live table with
-- RLS enabled and no policies), but there's no CREATE TABLE for it
-- anywhere in migrations. This migration creates both tables from
-- scratch. Do not apply the old RLS-only patch on top of this one — the
-- policies below are the same ones, now attached to a table that
-- actually exists.

-- Follow: one-directional, no approval, grants nothing beyond "I see
-- their public activity" if/when that's built. Does NOT unlock messaging
-- or calling — see friend_requests / are_friends() below for that.
CREATE TABLE public.follows (
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followed_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followed_id),
  CHECK (follower_id <> followed_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public reads follows"
  ON public.follows FOR SELECT
  USING (true);

CREATE POLICY "user follows as self"
  ON public.follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "user unfollows own follow"
  ON public.follows FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

-- Friend: mutual, requires acceptance. This is what's checked before
-- messaging/calling is allowed (see are_friends()).
CREATE TABLE public.friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants read their friend requests"
  ON public.friend_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "user creates own friend request"
  ON public.friend_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "requester cancels own pending request"
  ON public.friend_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = requester_id AND status = 'pending')
  WITH CHECK (auth.uid() = requester_id AND status = 'cancelled');

CREATE POLICY "addressee responds to pending request"
  ON public.friend_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = addressee_id AND status = 'pending')
  WITH CHECK (auth.uid() = addressee_id AND status IN ('accepted', 'declined'));

CREATE POLICY "staff read all friend requests"
  ON public.friend_requests FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','editor']::app_role[]));

CREATE INDEX idx_friend_requests_addressee ON public.friend_requests (addressee_id, status);
CREATE INDEX idx_friend_requests_requester ON public.friend_requests (requester_id, status);

-- Mutual-friendship check, used by messaging/call-permission logic.
CREATE OR REPLACE FUNCTION public.are_friends(a uuid, b uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friend_requests
    WHERE status = 'accepted'
      AND ((requester_id = a AND addressee_id = b)
        OR (requester_id = b AND addressee_id = a))
  );
$$;
