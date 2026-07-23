## 1. Swap photos between Hero and Muyan Collection

Only the image sources change — hero keeps its skewed-strip card style, Muyan keeps its geometric-strip card style. The homepage currently reads hero photos from `hero_images` (with a `fallbackHero` array) and Muyan cards from a hardcoded `muyanCards` array. I'll swap the two fallback/hardcoded photo sets so hero uses the current Muyan photos and Muyan uses the current hero photos. No card layout, sizing, or hover behavior changes.

## 2. Visitor accounts (readers)

- Reuse existing Supabase auth (`/auth`) but branch on role after sign-in: readers → `/account`, staff (admin/editor/moderator/guest_author) → `/admin`.
- New tables (all with RLS + grants + updated_at trigger):
  - `profiles` (user_id PK→auth.users, display_name, avatar_url, bio) — auto-created on signup via trigger.
  - `bookmarks` (user_id, content_type enum: story|diary|collection_item|gallery|dear_today, content_id, unique).
  - `comments` (user_id, content_type enum as above, content_id, body, status: visible|hidden, parent_id nullable for one-level replies).
- New `app_role` values: add `editor`, `moderator`, `guest_author`, `reader`. Default new signups get `reader` via trigger.
- New reader routes under `_authenticated/account/`:
  - `/account` — profile edit (display_name, avatar upload, bio).
  - `/account/bookmarks` — grouped list of saved items with links.
  - `/account/comments` — user's comment history.
- Reader-facing components:
  - `BookmarkButton` on story/diary/collection-item/gallery/dear-today detail pages (signed-out → prompt to sign in inline).
  - `CommentsSection` on the same detail pages: list + form + one-level replies; moderators can hide.
- Sign-in header affordance updates: show avatar + menu when signed in (Account, Bookmarks, Sign out); "Sign in" link when out.

## 3. Admin user management

New admin tab `/admin/users` (visible only to `admin` role):
- List all users (join `auth.users` via `supabaseAdmin` in a `createServerFn` gated by `has_role(...,'admin')`) with email, display_name, current roles, created_at.
- Actions: assign/remove roles (`admin`, `editor`, `moderator`, `guest_author`, `reader`), delete user (admin-only, with confirm).
- Invite by email (server fn calls `supabaseAdmin.auth.admin.inviteUserByEmail`).
- Role-based nav in `/admin/route.tsx`: editors see content tabs only; moderators additionally see a Comments moderation tab; admins see everything including Users.
- New `/admin/comments` tab for moderators: list recent comments across all content types, hide/restore, delete.

## 4. Homepage snippet sections (3 new)

Below the Muyan Collection strip, three "latest published" preview rows:
- **Latest Stories** — up to 6 story cards (cover, title, excerpt snippet, chapter label if any) → link to `/stories/$slug`.
- **From the Shop / Books** — up to 6 shop products with image + short description → link to `/shop`.
- **Dear Today** — up to 6 latest entries from the new `dear_today` table (see §5) → link to `/collection/dear-today` (or the item detail).

Each section uses the same editorial card style as existing pages (kraft/border, uppercase mono label, hover lift). All read from Supabase with public RLS; loader-prefetched via TanStack Query.

## 5. Dear Today (sub-collection with its own table)

- New `dear_today` table: `entry_date DATE NOT NULL`, `title`, `slug UNIQUE`, `excerpt`, `cover_url`, `body` (markdown), `published bool`, `published_at`, `author_id` (nullable, for guest_author attribution), taxonomy fields optional. RLS: public read for `published=true`; insert/update/delete for `admin`/`editor`/`guest_author` (guest_author only own rows).
- New admin editor `/admin/dear-today` (mirrors diary editor: MarkdownEditor, ImageUpload, TaxonomyPicker optional, date picker for `entry_date`).
- New public routes:
  - `/collection/dear-today` — chronological list grouped by month.
  - `/collection/dear-today/$slug` — full reader (same RichBody + MediaViewer + ReadingProgress as diary/story readers, plus BookmarkButton and CommentsSection).
- Link surfaced from the Collections page as one of the collections and from the homepage snippet section.

## 6. Review pass

After building, I'll:
- Run `bun run build:dev` and fix any type/build errors.
- Click through each new route in the preview (signed out + signed in as reader + signed in as admin) via Playwright: signup → reader dashboard, bookmark a story, leave a comment, admin promotes reader to editor, moderator hides a comment, dear-today publish flow, homepage snippet sections populate.
- Verify RLS with `supabase--read_query` sanity checks (reader can't read another user's bookmarks; anon can't insert comments).

## Technical details

- **Roles**: extend `app_role` enum with `editor`, `moderator`, `guest_author`, `reader`; keep `has_role` helper. Add convenience `has_any_role(uuid, app_role[])` for RLS.
- **Signup trigger**: `on_auth_user_created` inserts profile row + grants `reader` role.
- **Server fns**: all admin user-management calls go through `createServerFn` + `requireSupabaseAuth`, verify `has_role(context.userId, 'admin')` under the user's RLS-scoped client, then dynamic-import `supabaseAdmin` for the privileged action.
- **RLS shape** (per new table):
  - `profiles`: owner read/write own; public read of `display_name`+`avatar_url` via a `profiles_public` view (security_invoker) for comment author display.
  - `bookmarks`: owner-only for all ops.
  - `comments`: public read where `status='visible'`; authenticated insert with `user_id=auth.uid()`; owner update/delete own; moderator/admin update status.
  - `dear_today`: public read where published; write via role check.
- **Homepage snippet queries**: three parallel `useQuery` calls with `staleTime` set; server-fetched via loader `ensureQueryData` for SEO/OG (public reads only, no bearer).
- **Files added** (new):
  - `src/routes/_authenticated/account/route.tsx`, `index.tsx`, `bookmarks.tsx`, `comments.tsx`
  - `src/routes/_authenticated/admin/users.tsx`, `comments.tsx`, `dear-today.tsx`
  - `src/routes/collection.dear-today.tsx`, `src/routes/collection.dear-today.$slug.tsx`
  - `src/components/site/BookmarkButton.tsx`, `src/components/site/CommentsSection.tsx`
  - `src/lib/users.functions.ts`, `src/lib/users.server.ts`
- **Files edited**: `src/routes/index.tsx` (photo swap + 3 snippet rows), `src/routes/_authenticated/admin/route.tsx` (role-based nav + new tabs), `src/routes/auth.tsx` (post-signin routing), `src/components/site/SiteChrome.tsx` (account menu), `src/routes/stories.$slug.tsx` + `diaries.$slug.tsx` + `collection.tsx` + `gallery.tsx` (bookmark + comments mounts).
- **Migrations**: one migration adds enum values + `profiles`/`bookmarks`/`comments`/`dear_today` tables + triggers + RLS + grants.
