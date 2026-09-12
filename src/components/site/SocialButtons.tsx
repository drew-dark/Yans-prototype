import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck, Clock } from "lucide-react";

/**
 * Follow/Unfollow toggle with a brief pop + icon-swap animation on state
 * change (via tw-animate-css's animate-in utilities, already used
 * elsewhere in this project's dependency tree). The pop is driven by a
 * local flag rather than anything persisted — it only plays once, right
 * after the state actually changes.
 */
export function FollowButton({
  isFollowing,
  onToggle,
  pending,
  size = "sm",
}: {
  isFollowing: boolean;
  onToggle: () => void;
  pending?: boolean;
  size?: "sm" | "default";
}) {
  const [justChanged, setJustChanged] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    setJustChanged(true);
    const id = setTimeout(() => setJustChanged(false), 320);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFollowing]);

  return (
    <Button
      size={size}
      variant={isFollowing ? "outline" : "default"}
      onClick={onToggle}
      disabled={pending}
      className={`shrink-0 transition-transform duration-200 ${justChanged ? "scale-110" : "scale-100"}`}
    >
      <span key={String(isFollowing)} className="flex items-center animate-in zoom-in-50 duration-300">
        {isFollowing ? (
          <UserCheck className="mr-1.5 h-3.5 w-3.5" />
        ) : (
          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
        )}
        {isFollowing ? t("friends.following") : t("friends.follow")}
      </span>
    </Button>
  );
}

/**
 * Add-friend button that morphs into a "Pending" pill once the request
 * exists — same pop-on-change treatment as FollowButton.
 */
export function AddFriendButton({
  status,
  onSend,
  pending,
}: {
  status: "none" | "pending" | "accepted";
  onSend: () => void;
  pending?: boolean;
}) {
  const [justChanged, setJustChanged] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    setJustChanged(true);
    const id = setTimeout(() => setJustChanged(false), 320);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (status === "accepted") {
    return (
      <span
        key="accepted"
        className={`flex items-center font-mono text-[10px] uppercase tracking-widest text-white/40 animate-in zoom-in-50 duration-300 ${justChanged ? "scale-110" : "scale-100"}`}
      >
        {t("friends.alreadyFriends")}
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span
        key="pending"
        className={`flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-white/40 animate-in zoom-in-50 duration-300 ${justChanged ? "scale-110" : "scale-100"}`}
      >
        <Clock className="h-3 w-3" />
        {t("friends.pending")}
      </span>
    );
  }
  return (
    <Button
      size="sm"
      onClick={onSend}
      disabled={pending}
      className={`shrink-0 transition-transform duration-200 ${justChanged ? "scale-110" : "scale-100"}`}
    >
      <UserPlus className="mr-1.5 h-3.5 w-3.5" />
      {t("friends.addFriend")}
    </Button>
  );
}
