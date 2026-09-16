import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck, Clock, Check } from "lucide-react";
import { FollowScene } from "@/components/site/FollowScene";
import { LetterFoldAnimation } from "@/components/site/LetterFoldAnimation";

/**
 * Decorator pattern: none of these change what a click *does* — the
 * actual follow/unfollow/send-request/send-message logic lives in the
 * caller (usually via useSocialGraph). Each component only wraps the
 * base shadcn Button with a self-contained animation and settles back
 * into a plain labeled state afterward, so the same base Button is
 * reused rather than duplicated per animated variant.
 */

const FOLLOW_SCENE_MS = 2000; // Figure B (bob → pop-up at 0.9s → 0.4s → walk-off 0.7s) finishes last, at 2.0s — not Figure A's 1.6s

export function FollowButton({
  isFollowing,
  onToggle,
  pending,
  size = "sm",
}: {
  isFollowing: boolean;
  onToggle: () => void | Promise<void>;
  pending?: boolean;
  size?: "sm" | "default";
}) {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);
  const [errored, setErrored] = useState(false);

  function handleClick() {
    if (playing) return;
    if (isFollowing) {
      // Unfollow never plays the illustration — the scene depicts
      // "someone starts following you," which only applies to the
      // follow direction.
      onToggle();
      return;
    }
    setPlaying(true);
    const result = onToggle();
    if (result && typeof (result as Promise<void>).then === "function") {
      (result as Promise<void>).then(
        () => setTimeout(() => setPlaying(false), FOLLOW_SCENE_MS),
        () => {
          // Real failure — cut the animation short rather than let it
          // finish playing a "success" scene that didn't happen. The
          // caller is still responsible for its own error toast; this
          // is just the button's own brief visual acknowledgement.
          setPlaying(false);
          setErrored(true);
          setTimeout(() => setErrored(false), 1400);
        },
      );
    } else {
      setTimeout(() => setPlaying(false), FOLLOW_SCENE_MS);
    }
  }

  return (
    <Button
      size={size}
      variant={isFollowing ? "outline" : "default"}
      onClick={handleClick}
      disabled={pending || playing}
      className="shrink-0 overflow-hidden"
    >
      {playing ? (
        <FollowScene playing={playing} />
      ) : errored ? (
        <span className="text-red-400">{t("friends.followFailed")}</span>
      ) : (
        <span key={String(isFollowing)} className="flex items-center animate-in zoom-in-50 duration-300">
          {isFollowing ? (
            <UserCheck className="mr-1.5 h-3.5 w-3.5" />
          ) : (
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
          )}
          {isFollowing ? t("friends.following") : t("friends.follow")}
        </span>
      )}
    </Button>
  );
}

export function AddFriendButton({
  status,
  onSend,
  pending,
}: {
  status: "none" | "pending" | "accepted";
  onSend: () => void;
  pending?: boolean;
}) {
  const { t } = useTranslation();
  const [justChanged, setJustChanged] = useState(false);

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

const LETTER_ANIM_MS = 5000;

/**
 * onSend fires immediately, in parallel with the animation — the real
 * action never waits on the decorative 5s sequence. If it fails, the
 * animation is cut short and an error state shows instead of the
 * "sent" settle, so the animation can't imply success that didn't
 * happen.
 */
export function SendMessageButton({
  onSend,
  disabled,
  label,
}: {
  onSend: () => Promise<void> | void;
  disabled?: boolean;
  label?: string;
}) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<"idle" | "animating" | "sent" | "error">("idle");

  async function handleClick() {
    if (phase === "animating" || disabled) return;
    setPhase("animating");
    const start = Date.now();
    try {
      await onSend();
    } catch {
      setPhase("error");
      setTimeout(() => setPhase("idle"), 2000);
      return;
    }
    // Real send is confirmed successful at this point. Still respect the
    // animation's minimum display time if it finished fast, but never
    // show "sent" before the real result is actually known.
    const remaining = Math.max(0, LETTER_ANIM_MS - (Date.now() - start));
    setTimeout(() => setPhase("sent"), remaining);
    setTimeout(() => setPhase("idle"), remaining + 1800);
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleClick}
      disabled={disabled || phase === "animating"}
      className="shrink-0 overflow-hidden"
    >
      {phase === "animating" ? (
        <LetterFoldAnimation playing={true} />
      ) : phase === "sent" ? (
        <span className="flex items-center gap-1.5 animate-in zoom-in-50 duration-300">
          <Check className="h-3.5 w-3.5" />
          {t("footsteps.messageSent")}
        </span>
      ) : phase === "error" ? (
        <span className="text-red-400">{t("footsteps.messageError")}</span>
      ) : (
        <span className="flex items-center gap-1.5">{label ?? t("footsteps.message")}</span>
      )}
    </Button>
  );
}
