-- Notifications: friend requests, friend-request accepted, and new
-- followers. Rows are only ever written by the trigger functions below
-- (SECURITY DEFINER) — a user can never insert a notification directly,
-- which is what stops someone from spoofing a notification for another
-- user. Clients can only read their own and mark their own as read.

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('friend_request', 'friend_accept', 'new_follower')),
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user marks own notifications read"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_notifications_user_unread
  ON public.notifications (user_id, created_at DESC) WHERE NOT read;

-- New friend request → notify the addressee.
CREATE OR REPLACE FUNCTION public.tg_notify_friend_request()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, actor_id, type)
  VALUES (NEW.addressee_id, NEW.requester_id, 'friend_request');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_friend_request
  AFTER INSERT ON public.friend_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_friend_request();

-- Request accepted → notify the original requester.
CREATE OR REPLACE FUNCTION public.tg_notify_friend_accept()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    INSERT INTO public.notifications (user_id, actor_id, type)
    VALUES (NEW.requester_id, NEW.addressee_id, 'friend_accept');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_friend_accept
  AFTER UPDATE ON public.friend_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_friend_accept();

-- New follower → notify the person being followed.
CREATE OR REPLACE FUNCTION public.tg_notify_new_follower()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, actor_id, type)
  VALUES (NEW.followed_id, NEW.follower_id, 'new_follower');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_follower
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_follower();
