-- Addresses the Supabase database linter report. Several flagged items
-- are intentional design, not bugs -- left alone on purpose, noted below
-- rather than silently ignored:
--   * confirm_newsletter_subscriber / unsubscribe_newsletter_subscriber
--     being callable by anon is correct: these are clicked from an email
--     link by someone who is, by definition, not logged in.
--   * has_any_role being callable by authenticated is pre-existing
--     (predates this project's Claude-assisted work) and used internally
--     by several RLS policies; narrowing it risks breaking those and
--     wasn't asked for -- flagging for a deliberate decision later
--     rather than changing it here.
--   * auth_leaked_password_protection has no SQL fix -- it's a Supabase
--     Dashboard toggle: Authentication -> Providers -> Email -> "Leaked
--     password protection". Not covered by this migration.

-- 1. function_search_path_mutable: tg_newsletter_subscriber_defaults was
-- missing SET search_path, unlike every sibling function in the same
-- file (confirm_newsletter_subscriber right below it already has it).
ALTER FUNCTION public.tg_newsletter_subscriber_defaults() SET search_path = public;

-- 2. are_friends and start_conversation were callable via RPC by anon --
-- fully unauthenticated. are_friends leaks social-graph info (whether
-- any two arbitrary user ids are friends) to anyone, logged in or not.
-- start_conversation should never be reachable without a session at
-- all. Both are used internally by RLS policies scoped TO authenticated
-- only (never public/anon), so authenticated keeps EXECUTE -- required
-- for those policies to evaluate -- while anon's default PUBLIC grant is
-- removed.
REVOKE EXECUTE ON FUNCTION public.are_friends(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.are_friends(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.start_conversation(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_conversation(uuid, text) TO authenticated;

-- 3. The three notification trigger functions were exposed as public RPC
-- endpoints (/rest/v1/rpc/tg_notify_*) to both anon and authenticated --
-- they were never meant to be called directly at all, only implicitly
-- by their triggers on insert/update. Revoking EXECUTE entirely (no
-- replacement grant to anyone) removes the RPC exposure; the triggers
-- themselves keep firing normally, since trigger invocation doesn't go
-- through this same permission check.
REVOKE EXECUTE ON FUNCTION public.tg_notify_friend_request() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tg_notify_friend_accept() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tg_notify_new_follower() FROM PUBLIC;
