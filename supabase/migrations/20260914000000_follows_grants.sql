-- follows and friend_requests (20260909100000_friends_and_follows.sql)
-- were created with RLS policies but NO GRANT statements at all -- every
-- other table in this project's history (stories, dear_today, bookmarks,
-- etc.) explicitly grants SELECT/INSERT/etc. to anon/authenticated
-- alongside its RLS policies, but that migration missed it entirely.
-- Postgres checks the base table GRANT before it ever consults RLS, so
-- this made every client-side follow/unfollow/friend-request action fail
-- with a permission error regardless of how correct the policies were --
-- confirmed by grepping every migration in this project's history for
-- any GRANT on either table: zero matches, ever. This went unnoticed
-- because all prior testing either used a privileged SQL-console role
-- (which bypasses grants) or touched other tables that had grants from
-- their original migrations.

-- follows: public reads (policy has no TO restriction, applies broadly),
-- authenticated writes as self.
GRANT SELECT ON public.follows TO anon, authenticated;
GRANT INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;

-- friend_requests: authenticated only (no anon-readable policy exists),
-- covering read/create/cancel/accept/decline.
GRANT SELECT, INSERT, UPDATE ON public.friend_requests TO authenticated;
GRANT ALL ON public.friend_requests TO service_role;
