-- collections is shared by two unrelated content models: the generic
-- Collection Library (admin/collections.tsx + collection_entries) and the
-- story/diary taxonomy system (admin/taxonomy.tsx + Volumes/Seasons).
-- 0028 worked around this at read time in the public Library page by
-- inferring "is this a series" from volumes membership. This migration
-- makes it explicit instead: each collection now records which kind it
-- is, set once at creation by whichever admin surface created it.
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'library'
  CHECK (kind IN ('library', 'series'));

-- Backfill existing rows: anything with at least one Volume under it is
-- a series collection, regardless of when it was created.
UPDATE public.collections c
SET kind = 'series'
WHERE kind <> 'series'
  AND EXISTS (SELECT 1 FROM public.volumes v WHERE v.collection_id = c.id);

-- ----------------------------------------------------------------------
-- dear_today has collection_id/volume_id/season_id/chapter_number/
-- chapter_title columns (added in the 23063813 migration) that no admin
-- UI (admin/dear-today.tsx) has ever read or written, and whose shape
-- doesn't match stories/diary_entries' taxonomy columns anyway
-- (chapter_number here is integer, not numeric, and there's no
-- part_number/part_title at all). Confirmed dead via a full grep of the
-- app code before writing this. Guarded so it aborts loudly instead of
-- destroying data if that assumption turns out to be wrong for some row
-- that was set by hand outside the app.
-- ----------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.dear_today
    WHERE collection_id IS NOT NULL
       OR volume_id IS NOT NULL
       OR season_id IS NOT NULL
       OR chapter_number IS NOT NULL
       OR chapter_title IS NOT NULL
  ) THEN
    RAISE EXCEPTION
      'dear_today has non-null taxonomy column data -- these were assumed unused but are not. Aborting the DROP COLUMN below; investigate the actual rows before re-running this migration.';
  END IF;
END $$;

ALTER TABLE public.dear_today
  DROP COLUMN IF EXISTS collection_id,
  DROP COLUMN IF EXISTS volume_id,
  DROP COLUMN IF EXISTS season_id,
  DROP COLUMN IF EXISTS chapter_number,
  DROP COLUMN IF EXISTS chapter_title;
