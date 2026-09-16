-- Minimal messaging backend — scoped only to what the new animated
-- "Send message" button needs (create a conversation between two
-- friends, send one message into it). This is NOT the full inbox
-- design from earlier in this project's history (no media attachments,
-- no expiry, no thread-reading UI) — just enough for the button to do
-- something real rather than being purely decorative. A full inbox view
-- is still a separate, larger piece of work.

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.conversation_participants (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.conversation_participants TO authenticated;
GRANT ALL ON public.conversation_participants TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

CREATE POLICY "participants read their conversations"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = id AND cp.user_id = auth.uid()
  ));

CREATE POLICY "participants read participant rows"
  ON public.conversation_participants FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversation_participants self
    WHERE self.conversation_id = conversation_participants.conversation_id AND self.user_id = auth.uid()
  ));

CREATE POLICY "participants read their messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
  ));

CREATE POLICY "participant sends into their conversation"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
    )
  );

-- Creates (or reuses) a 1:1 conversation with another user and sends the
-- first message into it, atomically. SECURITY DEFINER so it can insert
-- the *other* person's participant row (a plain client insert couldn't,
-- since conversation_participants has no "insert your own row" policy —
-- membership is only ever established here, gated by are_friends, never
-- inserted directly by a client).
CREATE OR REPLACE FUNCTION public.start_conversation(other_user_id uuid, first_message text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  self_id uuid := auth.uid();
  convo_id uuid;
BEGIN
  IF self_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.are_friends(self_id, other_user_id) THEN
    RAISE EXCEPTION 'Can only message accepted friends';
  END IF;
  IF trim(first_message) = '' THEN
    RAISE EXCEPTION 'Message body required';
  END IF;

  SELECT cp1.conversation_id INTO convo_id
  FROM public.conversation_participants cp1
  JOIN public.conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = self_id AND cp2.user_id = other_user_id
  LIMIT 1;

  IF convo_id IS NULL THEN
    INSERT INTO public.conversations DEFAULT VALUES RETURNING id INTO convo_id;
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (convo_id, self_id), (convo_id, other_user_id);
  END IF;

  INSERT INTO public.messages (conversation_id, sender_id, body)
  VALUES (convo_id, self_id, trim(first_message));

  RETURN convo_id;
END;
$$;
