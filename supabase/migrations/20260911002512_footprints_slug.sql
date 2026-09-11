-- Footprints get individual detail pages (/footprints/$slug) — need a
-- unique, URL-safe slug. Existing rows get one generated from their
-- title so nothing breaks; new rows are expected to always set one
-- (enforced client-side, same as every other slugged content type in
-- this app — not enforced NOT NULL here to avoid a hard failure on
-- rows this backfill can't safely handle, e.g. two footprints that
-- happen to share a title).

ALTER TABLE public.footprints ADD COLUMN slug text;

UPDATE public.footprints
SET slug = lower(regexp_replace(regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
    || '-' || substring(id::text, 1, 8)
WHERE slug IS NULL;

ALTER TABLE public.footprints ADD CONSTRAINT footprints_slug_unique UNIQUE (slug);

CREATE INDEX idx_footprints_slug ON public.footprints (slug);
