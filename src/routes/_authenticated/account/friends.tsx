import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, X, Clock } from "lucide-react";
import { FollowButton, AddFriendButton } from "@/components/site/SocialButtons";

export const Route = createFileRoute("/_authenticated/account/friends")({
  component: FriendsPage,
});

type Profile = { user_id: string; username: string | null; display_name: string | null; avatar_url: string | null };
type FriendRequest = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
};

function ProfileRow({ profile }: { profile: Profile }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {profile.avatar_url ? (
        <img src={profile.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
      ) : (
        <div className="h-9 w-9 shrink-0 rounded-full bg-white/10" />
      )}
      <div className="min-w-0">
        <p className="truncate text-sm">{profile.display_name ?? profile.username}</p>
        {profile.username && <p className="truncate text-xs text-white/40">@{profile.username}</p>}
      </div>
    </div>
  );
}

function FriendsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: requests = [] } = useQuery({
    queryKey: ["friend_requests", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("friend_requests")
        .select("id, requester_id, addressee_id, status, created_at")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
      if (error) throw error;
      return data as FriendRequest[];
    },
  });

  const { data: following = [] } = useQuery({
    queryKey: ["following", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("followed_id")
        .eq("follower_id", userId as string);
      if (error) throw error;
      return (data ?? []).map((f) => f.followed_id);
    },
  });
  const followingSet = useMemo(() => new Set(following), [following]);

  const incoming = requests.filter((r) => r.status === "pending" && r.addressee_id === userId);
  const outgoing = requests.filter((r) => r.status === "pending" && r.requester_id === userId);
  const accepted = requests.filter((r) => r.status === "accepted");
  const friendIds = useMemo(
    () => accepted.map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id)),
    [accepted, userId],
  );

  const relevantIds = useMemo(
    () =>
      Array.from(
        new Set([
          ...requests.flatMap((r) => [r.requester_id, r.addressee_id]),
          ...following,
        ]),
      ),
    [requests, following],
  );

  const { data: profilesById = {} } = useQuery({
    queryKey: ["friend_profiles", relevantIds],
    enabled: relevantIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", relevantIds);
      if (error) throw error;
      return Object.fromEntries((data as Profile[]).map((p) => [p.user_id, p]));
    },
  });

  const { data: searchResults = [], isFetching: searching } = useQuery({
    queryKey: ["friend_search", q],
    enabled: q.trim().length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .neq("user_id", userId ?? "")
        .ilike("username", `%${q.trim()}%`)
        .limit(8);
      if (error) throw error;
      return data as Profile[];
    },
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["friend_requests", userId] });
  }

  const sendMut = useMutation({
    mutationFn: async (addresseeId: string) => {
      if (!userId) return;
      const { error } = await supabase
        .from("friend_requests")
        .insert({ requester_id: userId, addressee_id: addresseeId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("friends.requestSent"));
      invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : t("friends.error")),
  });

  const respondMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "accepted" | "declined" | "cancelled" }) => {
      const { error } = await supabase
        .from("friend_requests")
        .update({ status, responded_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : t("friends.error")),
  });

  const followMut = useMutation({
    mutationFn: async (followedId: string) => {
      if (!userId) return;
      const { error } = await supabase.from("follows").insert({ follower_id: userId, followed_id: followedId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["following", userId] }),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : t("friends.error")),
  });

  const unfollowMut = useMutation({
    mutationFn: async (followedId: string) => {
      if (!userId) return;
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", userId)
        .eq("followed_id", followedId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["following", userId] }),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : t("friends.error")),
  });

  // A pending or accepted row (in either direction) already covers this
  // pair — used to grey out "Add friend" in search results instead of
  // letting a duplicate request hit the DB's unique constraint.
  function existingRequestWith(otherId: string) {
    return requests.find(
      (r) =>
        (r.requester_id === userId && r.addressee_id === otherId) ||
        (r.requester_id === otherId && r.addressee_id === userId),
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl uppercase">{t("friends.title")}</h1>
        <p className="text-sm text-white/50">{t("friends.subtitle")}</p>
      </div>

      <div>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("friends.searchPlaceholder")}
          className="border-white/15 bg-black/40 sm:max-w-xs"
        />
        {q.trim().length >= 2 && (
          <div className="mt-3 space-y-2">
            {searching ? (
              <p className="text-sm text-white/40">{t("friends.searching")}</p>
            ) : searchResults.length === 0 ? (
              <p className="text-sm text-white/40">{t("friends.noResults")}</p>
            ) : (
              searchResults.map((p) => {
                const existing = existingRequestWith(p.user_id);
                const isFollowing = followingSet.has(p.user_id);
                const addFriendStatus: "none" | "pending" | "accepted" = !existing
                  ? "none"
                  : existing.status === "accepted"
                    ? "accepted"
                    : "pending";
                return (
                  <div key={p.user_id} className="flex items-center justify-between gap-3 rounded border border-white/10 bg-white/[0.03] p-3">
                    <ProfileRow profile={p} />
                    <div className="flex shrink-0 items-center gap-1.5">
                      <FollowButton
                        isFollowing={isFollowing}
                        pending={followMut.isPending || unfollowMut.isPending}
                        onToggle={() =>
                          isFollowing ? unfollowMut.mutate(p.user_id) : followMut.mutate(p.user_id)
                        }
                      />
                      <AddFriendButton
                        status={addFriendStatus}
                        pending={sendMut.isPending}
                        onSend={() => sendMut.mutate(p.user_id)}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {incoming.length > 0 && (
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
            {t("friends.incoming")}
          </p>
          {incoming.map((r) => {
            const p = profilesById[r.requester_id];
            if (!p) return null;
            return (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded border border-white/10 bg-white/[0.03] p-3">
                <ProfileRow profile={p} />
                <div className="flex shrink-0 gap-1.5">
                  <Button size="sm" onClick={() => respondMut.mutate({ id: r.id, status: "accepted" })}>
                    <Check className="mr-1 h-3.5 w-3.5" />
                    {t("friends.accept")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => respondMut.mutate({ id: r.id, status: "declined" })}>
                    <X className="mr-1 h-3.5 w-3.5" />
                    {t("friends.decline")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {outgoing.length > 0 && (
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
            {t("friends.outgoing")}
          </p>
          {outgoing.map((r) => {
            const p = profilesById[r.addressee_id];
            if (!p) return null;
            return (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded border border-white/10 bg-white/[0.03] p-3">
                <ProfileRow profile={p} />
                <div className="flex shrink-0 items-center gap-2">
                  <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
                    <Clock className="h-3 w-3" />
                    {t("friends.pending")}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => respondMut.mutate({ id: r.id, status: "cancelled" })}>
                    {t("friends.cancel")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
          {t("friends.yourFriends")} {friendIds.length > 0 && `(${friendIds.length})`}
        </p>
        {friendIds.length === 0 ? (
          <p className="text-sm text-white/40">{t("friends.noFriendsYet")}</p>
        ) : (
          friendIds.map((id) => {
            const p = profilesById[id];
            if (!p) return null;
            return (
              <div key={id} className="flex items-center gap-3 rounded border border-white/10 bg-white/[0.03] p-3">
                <ProfileRow profile={p} />
              </div>
            );
          })
        )}
      </div>

      <div className="space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
          {t("friends.followingTitle")} {following.length > 0 && `(${following.length})`}
        </p>
        {following.length === 0 ? (
          <p className="text-sm text-white/40">{t("friends.noFollowingYet")}</p>
        ) : (
          following.map((id) => {
            const p = profilesById[id];
            if (!p) return null;
            return (
              <div key={id} className="flex items-center justify-between gap-3 rounded border border-white/10 bg-white/[0.03] p-3">
                <ProfileRow profile={p} />
                <FollowButton
                  isFollowing={true}
                  pending={unfollowMut.isPending}
                  onToggle={() => unfollowMut.mutate(id)}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
