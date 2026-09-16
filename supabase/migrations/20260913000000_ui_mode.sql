-- Immersive mode: a layout mode (bento grids + a three.js ambient
-- background), not a 12th color theme — it composes with whichever
-- theme (profiles.theme) the person already has, including the
-- existing glass/clay morphism themes (sakura, ai, matcha, sumi). See
-- the "Japan-inspired themes, each paired with a morphism style"
-- comment in styles.css for that existing system.

ALTER TABLE public.profiles
  ADD COLUMN ui_mode text NOT NULL DEFAULT 'classic'
  CHECK (ui_mode IN ('classic', 'immersive'));
