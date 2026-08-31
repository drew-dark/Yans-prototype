import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { ContentKind } from "./BookmarkButton";

type CommentRow = {
  id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  status: "visible" | "hidden";
  created_at: string;
  profiles?: { display_name: string | null; avatar_url: string | null } | null;
};

export function CommentsSection({
  contentType,
  contentId,
}: {
  contentType: ContentKind;
  contentId: string;
}) {
  const { t } = useTranslation();
  const [userId, setUserId] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("comments")
      .select("id, user_id, parent_id, body, status, created_at")
      .eq("content_type", contentType)
      .eq("content_id", contentId)
      .order("created_at", { ascending: true });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as unknown as CommentRow[];
    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    let profiles: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      profiles = Object.fromEntries(
        ((profs ?? []) as unknown as Array<{ user_id: string; display_name: string | null; avatar_url: string | null }>)
          .map((p) => [p.user_id, { display_name: p.display_name, avatar_url: p.avatar_url }]),
      );
    }
    setComments(rows.map((r) => ({ ...r, profiles: profiles[r.user_id] ?? null })));
    setLoading(false);
  }, [contentType, contentId]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data: r } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", uid);
        setRoles((r ?? []).map((x: { role: string }) => x.role));
      }
      await load();
    })();
  }, [load]);

  const isMod = roles.includes("admin") || roles.includes("moderator");

  async function post(parentId: string | null, text: string, clear: () => void) {
    if (!userId) return;
    const t = text.trim();
    if (!t) return;
    setPosting(true);
    try {
      const { error } = await supabase
        .from("comments")
        .insert({
          user_id: userId,
          content_type: contentType,
          content_id: contentId,
          parent_id: parentId,
          body: t,
        });
      if (error) throw error;
      clear();
      setReplyTo(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setPosting(false);
    }
  }

  async function del(id: string) {
    if (!confirm(t("comments.deleteConfirm"))) return;
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await load();
  }

  async function toggleHide(row: CommentRow) {
    const next = row.status === "visible" ? "hidden" : "visible";
    const { error } = await supabase
      .from("comments")
      .update({ status: next })
      .eq("id", row.id);
    if (error) return toast.error(error.message);
    await load();
  }

  const roots = comments.filter((c) => !c.parent_id);
  const repliesOf = (id: string) => comments.filter((c) => c.parent_id === id);

  return (
    <section className="mt-16 border-t border-white/10 pt-10">
      <h2 className="font-display text-2xl uppercase tracking-tight">{t("comments.title")}</h2>

      {userId ? (
        <div className="mt-6 space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("comments.placeholder")}
            className="min-h-[80px] bg-neutral-900 border-neutral-800"
            maxLength={4000}
          />
          <div className="flex justify-end">
            <Button
              className="h-11 w-full sm:h-9 sm:w-auto"
              disabled={posting || !body.trim()}
              onClick={() => post(null, body, () => setBody(""))}
            >
              {posting ? t("comments.posting") : t("comments.post")}
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-6 text-sm text-white/50">
          <Link to="/auth" className="underline hover:text-white">
            {t("comments.signIn")}
          </Link>{" "}
          {t("comments.toLeaveComment")}
        </p>
      )}

      <div className="mt-8 space-y-6">
        {loading && <p className="text-sm text-white/40">{t("comments.loading")}</p>}
        {!loading && roots.length === 0 && (
          <p className="text-sm text-white/40">{t("comments.empty")}</p>
        )}
        {roots.map((c) => (
          <CommentItem
            key={c.id}
            row={c}
            userId={userId}
            isMod={isMod}
            onReply={() => setReplyTo(replyTo === c.id ? null : c.id)}
            onDelete={() => del(c.id)}
            onToggleHide={() => toggleHide(c)}
            t={t}
          >
            {replyTo === c.id && userId && (
              <div className="mt-3 space-y-2">
                <Textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder={t("comments.replyPlaceholder")}
                  className="min-h-[60px] bg-neutral-900 border-neutral-800"
                  maxLength={4000}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    className="h-11 flex-1 sm:h-9 sm:flex-none"
                    onClick={() => setReplyTo(null)}
                  >
                    {t("comments.cancel")}
                  </Button>
                  <Button
                    className="h-11 flex-1 sm:h-9 sm:flex-none"
                    disabled={posting || !replyBody.trim()}
                    onClick={() => post(c.id, replyBody, () => setReplyBody(""))}
                  >
                    {t("comments.reply")}
                  </Button>
                </div>
              </div>
            )}
            {repliesOf(c.id).length > 0 && (
              <div className="mt-4 space-y-4 border-l border-white/10 pl-4">
                {repliesOf(c.id).map((r) => (
                  <CommentItem
                    key={r.id}
                    row={r}
                    userId={userId}
                    isMod={isMod}
                    onDelete={() => del(r.id)}
                    onToggleHide={() => toggleHide(r)}
                    t={t}
                  />
                ))}
              </div>
            )}
          </CommentItem>
        ))}
      </div>
    </section>
  );
}

function CommentItem({
  row,
  userId,
  isMod,
  onReply,
  onDelete,
  onToggleHide,
  children,
  t,
}: {
  row: CommentRow;
  userId: string | null;
  isMod: boolean;
  onReply?: () => void;
  onDelete: () => void;
  onToggleHide: () => void;
  children?: React.ReactNode;
  t: (key: string) => string;
}) {
  const hidden = row.status === "hidden";
  const canDelete = userId === row.user_id || isMod;
  const name = row.profiles?.display_name || t("comments.reader");
  return (
    <div className={`rounded border border-white/10 bg-neutral-900/50 p-4 ${hidden ? "opacity-50" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2">
          {row.profiles?.avatar_url ? (
            <img src={row.profiles.avatar_url} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 font-mono text-[10px] uppercase">
              {name.slice(0, 1)}
            </div>
          )}
          <span className="truncate font-mono text-xs text-white/70">{name}</span>
          <span className="shrink-0 font-mono text-[10px] text-white/30">
            {new Date(row.created_at).toLocaleDateString()}
          </span>
          {hidden && (
            <span className="rounded bg-red-500/20 px-1.5 py-0.5 font-mono text-[9px] uppercase text-red-300">
              {t("comments.hidden")}
            </span>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-white/40 sm:gap-2 [&>button]:inline-flex [&>button]:min-h-11 [&>button]:min-w-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded [&>button]:px-2 [&>button]:transition-colors sm:[&>button]:min-h-9 sm:[&>button]:min-w-0 sm:[&>button]:px-1.5">

          {onReply && userId && (
            <button type="button" onClick={onReply} className="hover:bg-white/10 hover:text-white active:bg-white/20">
              {t("comments.reply")}
            </button>
          )}
          {isMod && (
            <button type="button" onClick={onToggleHide} className="hover:bg-white/10 hover:text-white active:bg-white/20">
              {hidden ? t("comments.restore") : t("comments.hide")}
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="text-red-400 hover:bg-red-500/10 hover:text-red-300 active:bg-red-500/20"
            >
              {t("comments.delete")}
            </button>
          )}
        </div>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/80">{row.body}</p>
      {children}
    </div>
  );
}
