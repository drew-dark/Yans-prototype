-- Collection entries (the new Library > Collection Home > Entry reader
-- structure) need their own content_kind for bookmarks/comments/reactions.
-- Own migration file, ahead of the tables that reference it — ALTER TYPE
-- ADD VALUE must be committed before the new value can be used elsewhere.
ALTER TYPE public.content_kind ADD VALUE IF NOT EXISTS 'collection_entry';
