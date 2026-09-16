import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  socialKeys,
  fetchFriendRequests,
  fetchFollowing,
  deriveFriendStatus,
  deriveFriendIds,
  sendFriendRequest,
  respondFriendRequest,
  followUser,
  unfollowUser,
  type FriendStatus,
} from "@/lib/social";

/**
 * The one hook every screen uses to read or act on the follow/friend
 * graph — see src/lib/social.ts for why this is structured as a single
 * shared source rather than one query per screen.
 */
export function useSocialGraph(selfId: string | null) {
  const qc = useQueryClient();

  const { data: requests = [] } = useQuery({
    queryKey: socialKeys.friendRequests(selfId),
    enabled: !!selfId,
    queryFn: () => fetchFriendRequests(selfId as string),
  });

  const { data: following = [] } = useQuery({
    queryKey: socialKeys.following(selfId),
    enabled: !!selfId,
    queryFn: () => fetchFollowing(selfId as string),
  });

  const followingSet = new Set(following);
  const friendIds = deriveFriendIds(requests, selfId);

  function invalidateRequests() {
    qc.invalidateQueries({ queryKey: socialKeys.friendRequests(selfId) });
  }
  function invalidateFollowing() {
    qc.invalidateQueries({ queryKey: socialKeys.following(selfId) });
  }

  const sendMut = useMutation({
    mutationFn: (otherId: string) => sendFriendRequest(selfId as string, otherId),
    onSuccess: invalidateRequests,
  });
  const respondMut = useMutation({
    mutationFn: (args: { id: string; status: "accepted" | "declined" | "cancelled" }) =>
      respondFriendRequest(args.id, args.status),
    onSuccess: invalidateRequests,
  });
  const followMut = useMutation({
    mutationFn: (otherId: string) => followUser(selfId as string, otherId),
    onSuccess: invalidateFollowing,
  });
  const unfollowMut = useMutation({
    mutationFn: (otherId: string) => unfollowUser(selfId as string, otherId),
    onSuccess: invalidateFollowing,
  });

  return {
    requests,
    following,
    friendIds,
    statusWith: (otherId: string): FriendStatus => deriveFriendStatus(requests, selfId, otherId),
    isFollowing: (otherId: string) => followingSet.has(otherId),
    sendRequest: sendMut.mutate,
    respond: respondMut.mutate,
    follow: followMut.mutate,
    unfollow: unfollowMut.mutate,
    // Async variants so FollowButton can await the real result before
    // completing its animation, rather than assuming success at click time.
    followAsync: followMut.mutateAsync,
    unfollowAsync: unfollowMut.mutateAsync,
    // Scoped to the specific person/request being acted on — not one
    // global flag — so clicking Follow on one row doesn't disable every
    // other row's buttons on the same page while it's in flight.
    isPendingFor: (otherId: string) =>
      (sendMut.isPending && sendMut.variables === otherId) ||
      (followMut.isPending && followMut.variables === otherId) ||
      (unfollowMut.isPending && unfollowMut.variables === otherId),
    isRespondPending: (requestId: string) => respondMut.isPending && respondMut.variables?.id === requestId,
  };
}
