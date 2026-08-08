DROP POLICY IF EXISTS "dear_today public read published" ON public.dear_today;
CREATE POLICY "dear_today anon read published" ON public.dear_today
  FOR SELECT TO anon USING (published = true);
CREATE POLICY "dear_today auth read" ON public.dear_today
  FOR SELECT TO authenticated USING (
    published = true
    OR auth.uid() = author_id
    OR public.has_any_role(auth.uid(), ARRAY['admin','editor','moderator']::app_role[])
  );

DROP POLICY IF EXISTS "comments public read visible" ON public.comments;
CREATE POLICY "comments anon read visible" ON public.comments
  FOR SELECT TO anon USING (status = 'visible');
CREATE POLICY "comments auth read" ON public.comments
  FOR SELECT TO authenticated USING (
    status = 'visible'
    OR auth.uid() = user_id
    OR public.has_any_role(auth.uid(), ARRAY['admin','moderator']::app_role[])
  );