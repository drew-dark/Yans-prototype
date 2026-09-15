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
DECLARE
  present_cols text[];
  where_clause text := '';
  col text;
  has_data boolean := false;
BEGIN
  -- Only check columns that actually exist on this database -- the
  -- 23063813 migration that was supposed to add these apparently never
  -- ran here (same migration-history-drift pattern seen earlier with
  -- friend_requests), so referencing them directly errors at parse time
  -- before DROP COLUMN IF EXISTS ever gets a chance to no-op safely.
  SELECT array_agg(column_name) INTO present_cols
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'dear_today'
    AND column_name IN ('collection_id', 'volume_id', 'season_id', 'chapter_number', 'chapter_title');

  IF present_cols IS NOT NULL AND array_length(present_cols, 1) > 0 THEN
    FOREACH col IN ARRAY present_cols LOOP
      where_clause := where_clause || CASE WHEN where_clause = '' THEN '' ELSE ' OR ' END
        || quote_ident(col) || ' IS NOT NULL';
    END LOOP;

    EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.dear_today WHERE %s)', where_clause)
      INTO has_data;

    IF has_data THEN
      RAISE EXCEPTION
        'dear_today has non-null data in one or more of % -- these were assumed unused but are not. Aborting the DROP COLUMN below; investigate the actual rows before re-running this migration.',
        present_cols;
    END IF;
  END IF;
  -- If present_cols is empty, there's nothing to check and nothing to
  -- drop -- DROP COLUMN IF EXISTS below is already a safe no-op for that.
END $$;

ALTER TABLE public.dear_today
  DROP COLUMN IF EXISTS collection_id,
  DROP COLUMN IF EXISTS volume_id,
  DROP COLUMN IF EXISTS season_id,
  DROP COLUMN IF EXISTS chapter_number,
  DROP COLUMN IF EXISTS chapter_title;
