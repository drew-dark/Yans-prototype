-- Footsteps page customization: lets a user style their own public micro-
-- page independently of the theme they browse the rest of the site in
-- (profiles.theme). Covered by the existing "profiles owner update" /
-- "profiles public read" policies (row-level, not column-restricted) —
-- no new RLS needed.

ALTER TABLE public.profiles
  ADD COLUMN footsteps_theme text,
  ADD COLUMN footsteps_tagline text,
  ADD COLUMN footsteps_banner_url text;

ALTER TABLE public.profiles
  ADD CONSTRAINT footsteps_tagline_length CHECK (char_length(footsteps_tagline) <= 140);
