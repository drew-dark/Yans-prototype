import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ContentKind } from "./BookmarkButton";

export const REACTION_EMOJI = ["👍", "❤️", "🔥", "😂", "😮", "🙏"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJI)[number];

type ReactionRow = { emoji: string; user_id: string };

function useReactions(contentType: ContentKind, contentId: string) {
  return useQuery({
    queryKey: ["reactions", contentType, contentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reactions")
        .select("emoji, user_id")
        .eq("content_type", contentType)
        .eq("content_id", contentId);
      if (error) throw error;
      return (data ?? []) as ReactionRow[];
    },
    staleTime: 15_000,
  });
}

function countByEmoji(rows: ReactionRow[]) {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
  return counts;
}

/**
 * Full emoji picker + live counts, for detail pages (story, diary, dear
 * today, gallery selected panel) — sits next to BookmarkButton.
 */
export function ReactionBar({
  contentType,
  contentId,
}: {
  contentType: ContentKind;
  contentId: string;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: rows = [] } = useReactions(contentType, contentId);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!cancelled) {
        setUserId(data.user?.id ?? null);
        setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = countByEmoji(rows);
  const mine = new Set(rows.filter((r) => r.user_id === userId).map((r) => r.emoji));

  async function toggle(emoji: ReactionEmoji) {
    if (!userId) return;
    const key = ["reactions", contentType, contentId] as const;
    const hasIt = mine.has(emoji);
    try {
      if (hasIt) {
        const { error } = await supabase
          .from("reactions")
          .delete()
          .eq("user_id", userId)
          .eq("content_type", contentType)
          .eq("content_id", contentId)
          .eq("emoji", emoji);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("reactions")
          .insert({ user_id: userId, content_type: contentType, content_id: contentId, emoji });
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: key });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("reactions.genericError"));
    }
  }

  if (checking) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="group"
      aria-label={t("reactions.groupAria")}
    >
      {REACTION_EMOJI.map((emoji) => {
        const count = counts.get(emoji) ?? 0;
        const active = mine.has(emoji);
        const className = `inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${
          active
            ? "border-white bg-white text-ink-dark"
            : "border-white/20 text-white/70 hover:border-white hover:text-white"
        }`;

        if (!userId) {
          return (
            <Link
              key={emoji}
              to="/auth"
              className={className}
              aria-label={t("reactions.signInAria")}
            >
              <span>{emoji}</span>
              {count > 0 && <span className="font-mono text-[10px]">{count}</span>}
            </Link>
          );
        }

        return (
          <button
            key={emoji}
            type="button"
            onClick={() => toggle(emoji)}
            className={className}
            aria-pressed={active}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="font-mono text-[10px]">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Compact, read-only reaction summary for grid/list cards: the single
 * most-used emoji plus a total count. Tapping a card opens the item —
 * the full picker lives on the detail view via <ReactionBar>.
 */
export function ReactionSummary({
  contentType,
  contentId,
}: {
  contentType: ContentKind;
  contentId: string;
}) {
  const { data: rows = [] } = useReactions(contentType, contentId);
  if (rows.length === 0) return null;

  const counts = countByEmoji(rows);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const total = rows.length;

  return (
    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-white/50">
      <span>{top[0]}</span>
      <span>{total}</span>
    </span>
  );
}
