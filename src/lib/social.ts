import { supabase } from "@/integrations/supabase/client";

/**
 * Singleton-style data layer for the follow/friend graph.
 *
 * There is exactly one canonical way to ask "are these two people
 * friends?" or "does X follow Y?" in this app — this module. Every
 * surface that needs that answer (the friends page, the Footsteps page,
 * inline comment actions) goes through the same query-key factory below,
 * so React Query's cache — itself keyed by these exact strings — holds
 * one shared instance of the social graph per session instead of each
 * screen quietly maintaining its own slightly-different copy. Accept a
 * friend request on the friends page and the Footsteps page you already
 * had open reflects it without a manual refetch, because it's the same
 * cache entry, not a coincidence.
 */

export type Profile = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type FriendRequestRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  created_at: string;
};

export type FriendStatus = "none" | "pending_outgoing" | "pending_incoming" | "accepted";

export const socialKeys = {
  friendRequests: (userId: string | null) => ["friend_requests", userId] as const,
  following: (userId: string | null) => ["following", userId] as const,
  isFollowing: (viewerId: string | null, targetId: string) => ["is_following", viewerId, targetId] as const,
  profiles: (ids: string[]) => ["social_profiles", [...ids].sort()] as const,
};

export async function fetchFriendRequests(userId: string): Promise<FriendRequestRow[]> {
  const { data, error } = await supabase
    .from("friend_requests")
    .select("id, requester_id, addressee_id, status, created_at")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) throw error;
  return data as FriendRequestRow[];
}

export async function fetchFollowing(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from("follows").select("followed_id").eq("follower_id", userId);
  if (error) throw error;
  return (data ?? []).map((f) => f.followed_id);
}

export async function fetchIsFollowing(viewerId: string, targetId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", viewerId)
    .eq("followed_id", targetId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function fetchProfilesByIds(ids: string[]): Promise<Record<string, Profile>> {
  if (ids.length === 0) return {};
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, username, display_name, avatar_url")
    .in("user_id", ids);
  if (error) throw error;
  return Object.fromEntries((data as Profile[]).map((p) => [p.user_id, p]));
}

export async function sendFriendRequest(requesterId: string, addresseeId: string) {
  const { error } = await supabase
    .from("friend_requests")
    .insert({ requester_id: requesterId, addressee_id: addresseeId });
  if (error) throw error;
}

export async function respondFriendRequest(
  id: string,
  status: "accepted" | "declined" | "cancelled",
) {
  const { error } = await supabase
    .from("friend_requests")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function followUser(followerId: string, followedId: string) {
  const { error } = await supabase.from("follows").insert({ follower_id: followerId, followed_id: followedId });
  if (error) throw error;
}

export async function unfollowUser(followerId: string, followedId: string) {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("followed_id", followedId);
  if (error) throw error;
}

/** Friend status between the signed-in user and someone else, derived
 * once from the shared friend_requests list rather than re-queried per
 * surface. */
export function deriveFriendStatus(
  requests: FriendRequestRow[],
  selfId: string | null,
  otherId: string,
): FriendStatus {
  if (!selfId) return "none";
  const row = requests.find(
    (r) =>
      (r.requester_id === selfId && r.addressee_id === otherId) ||
      (r.requester_id === otherId && r.addressee_id === selfId),
  );
  if (!row) return "none";
  if (row.status === "accepted") return "accepted";
  if (row.status === "pending") return row.requester_id === selfId ? "pending_outgoing" : "pending_incoming";
  return "none"; // declined/cancelled — free to send a new request
}

export function deriveFriendIds(requests: FriendRequestRow[], selfId: string | null): string[] {
  if (!selfId) return [];
  return requests
    .filter((r) => r.status === "accepted")
    .map((r) => (r.requester_id === selfId ? r.addressee_id : r.requester_id));
}
