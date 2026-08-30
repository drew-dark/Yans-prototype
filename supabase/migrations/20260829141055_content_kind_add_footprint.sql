-- The Footprints page (previous patch) reuses the shared content_kind enum
-- for bookmarks/comments/reactions, so it needs a value of its own.
-- ALTER TYPE ... ADD VALUE must be committed before the new value can be
-- used elsewhere, so this is its own migration file, ahead of reactions.sql.
ALTER TYPE public.content_kind ADD VALUE IF NOT EXISTS 'footprint';
