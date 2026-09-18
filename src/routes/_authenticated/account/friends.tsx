import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfilesByIds, socialKeys, type Profile } from "@/lib/social";
import { useSocialGraph } from "@/hooks/use-social-graph";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, X, Clock } from "lucide-react";
import { FollowButton, AddFriendButton } from "@/components/site/SocialButtons";
import { useImmersiveMode } from "@/components/site/ImmersiveModeProvider";
import { BentoGrid, BentoCell } from "@/components/site/BentoGrid";

export const Route = createFileRoute("/_authenticated/account/friends")({
  component: FriendsPage,
});

function ProfileRow({ profile }: { profile: Profile }) {
  const content = (
    <>
      {profile.avatar_url ? (
        <img src={profile.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
      ) : (
        <div className="h-9 w-9 shrink-0 rounded-full bg-white/10" />
      )}
      <div className="min-w-0">
        <p className="truncate text-sm">{profile.display_name ?? profile.username}</p>
        {profile.username && <p className="truncate text-xs text-white/40">@{profile.username}</p>}
      </div>
    </>
  );
  if (profile.username) {
    return (
      <Link
        to="/footsteps/$username"
        params={{ username: profile.username }}
        className="flex min-w-0 items-center gap-3 hover:opacity-80"
      >
        {content}
      </Link>
    );
  }
  return <div className="flex min-w-0 items-center gap-3">{content}</div>;
}

function FriendsPage() {
  const { t } = useTranslation();
  const [userId, setUserId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const social = useSocialGraph(userId);
  const { mode: uiMode } = useImmersiveMode();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const incoming = social.requests.filter((r) => r.status === "pending" && r.addressee_id === userId);
  const outgoing = social.requests.filter((r) => r.status === "pending" && r.requester_id === userId);

  const relevantIds = useMemo(
    () =>
      Array.from(
        new Set([...social.requests.flatMap((r) => [r.requester_id, r.addressee_id]), ...social.following]),
      ),
    [social.requests, social.following],
  );

  const { data: profilesById = {} } = useQuery({
    queryKey: socialKeys.profiles(relevantIds),
    enabled: relevantIds.length > 0,
    queryFn: () => fetchProfilesByIds(relevantIds),
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

  function handleError(e: unknown) {
    toast.error(e instanceof Error ? e.message : t("friends.error"));
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
                const raw = social.statusWith(p.user_id);
                const addFriendStatus = raw === "accepted" ? "accepted" : raw === "none" ? "none" : "pending";
                return (
                  <div key={p.user_id} className="flex items-center justify-between gap-3 rounded border border-white/10 bg-white/[0.03] p-3">
                    <ProfileRow profile={p} />
                    <div className="flex shrink-0 items-center gap-1.5">
                      <FollowButton
                        isFollowing={social.isFollowing(p.user_id)}
                        pending={social.isPendingFor(p.user_id)}
                        onToggle={() =>
                          social.isFollowing(p.user_id)
                            ? social.unfollow(p.user_id, { onError: handleError })
                            : social.followAsync(p.user_id).catch((e) => {
                                handleError(e);
                                throw e;
                              })
                        }
                      />
                      <AddFriendButton
                        status={addFriendStatus}
                        pending={social.isPendingFor(p.user_id)}
                        onSend={() => social.sendRequest(p.user_id, { onError: handleError })}
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
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">{t("friends.incoming")}</p>
          {incoming.map((r) => {
            const p = profilesById[r.requester_id];
            if (!p) return null;
            return (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded border border-white/10 bg-white/[0.03] p-3">
                <ProfileRow profile={p} />
                <div className="flex shrink-0 gap-1.5">
                  <Button size="sm" disabled={social.isRespondPending(r.id)} onClick={() => social.respond({ id: r.id, status: "accepted" }, { onError: handleError })}>
                    <Check className="mr-1 h-3.5 w-3.5" />
                    {t("friends.accept")}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={social.isRespondPending(r.id)} onClick={() => social.respond({ id: r.id, status: "declined" }, { onError: handleError })}>
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
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">{t("friends.outgoing")}</p>
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
                  <Button size="sm" variant="ghost" disabled={social.isRespondPending(r.id)} onClick={() => social.respond({ id: r.id, status: "cancelled" }, { onError: handleError })}>
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
          {t("friends.yourFriends")} {social.friendIds.length > 0 && `(${social.friendIds.length})`}
        </p>
        {social.friendIds.length === 0 ? (
          <p className="text-sm text-white/40">{t("friends.noFriendsYet")}</p>
        ) : uiMode === "immersive" ? (
          <BentoGrid>
            {social.friendIds.map((id) => {
              const p = profilesById[id];
              if (!p) return null;
              return (
                <BentoCell key={id} colSpan={1}>
                  <ProfileRow profile={p} />
                </BentoCell>
              );
            })}
          </BentoGrid>
        ) : (
          social.friendIds.map((id) => {
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
          {t("friends.followingTitle")} {social.following.length > 0 && `(${social.following.length})`}
        </p>
        {social.following.length === 0 ? (
          <p className="text-sm text-white/40">{t("friends.noFollowingYet")}</p>
        ) : uiMode === "immersive" ? (
          <BentoGrid>
            {social.following.map((id) => {
              const p = profilesById[id];
              if (!p) return null;
              return (
                <BentoCell key={id} colSpan={1}>
                  <div className="flex items-center justify-between gap-3">
                    <ProfileRow profile={p} />
                    <FollowButton
                      isFollowing={true}
                      pending={social.isPendingFor(id)}
                      onToggle={() => social.unfollow(id, { onError: handleError })}
                    />
                  </div>
                </BentoCell>
              );
            })}
          </BentoGrid>
        ) : (
          social.following.map((id) => {
            const p = profilesById[id];
            if (!p) return null;
            return (
              <div key={id} className="flex items-center justify-between gap-3 rounded border border-white/10 bg-white/[0.03] p-3">
                <ProfileRow profile={p} />
                <FollowButton
                  isFollowing={true}
                  pending={social.isPendingFor(id)}
                  onToggle={() => social.unfollow(id, { onError: handleError })}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
