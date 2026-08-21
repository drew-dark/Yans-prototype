import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export type ContentKind =
  | "story"
  | "diary"
  | "collection_item"
  | "gallery"
  | "dear_today";

export function BookmarkButton({
  contentType,
  contentId,
}: {
  contentType: ContentKind;
  contentId: string;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      if (cancelled) return;
      setUserId(uid);
      if (!uid) {
        setChecking(false);
        return;
      }
      const { data: row } = await supabase
        .from("bookmarks")
        .select("id")
        .eq("user_id", uid)
        .eq("content_type", contentType)
        .eq("content_id", contentId)
        .maybeSingle();
      if (cancelled) return;
      setSaved(!!row);
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [contentType, contentId]);

  async function toggle() {
    if (!userId) return;
    setBusy(true);
    try {
      if (saved) {
        const { error } = await supabase
          .from("bookmarks")
          .delete()
          .eq("user_id", userId)
          .eq("content_type", contentType)
          .eq("content_id", contentId);
        if (error) throw error;
        setSaved(false);
        toast.success("Removed from bookmarks");
      } else {
        const { error } = await supabase
          .from("bookmarks")
          .insert({ user_id: userId, content_type: contentType, content_id: contentId });
        if (error) throw error;
        setSaved(true);
        toast.success("Saved to bookmarks");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (checking) return null;

  if (!userId) {
    return (
      <Link
        to="/auth"
        className="inline-flex items-center gap-2 border border-white/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-white/60 hover:border-white hover:text-white"
      >
        <Bookmark className="h-3 w-3" /> Sign in to bookmark
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`inline-flex items-center gap-2 border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${
        saved
          ? "border-white bg-white text-ink-dark"
          : "border-white/20 text-white/70 hover:border-white hover:text-white"
      }`}
    >
      {saved ? <BookmarkCheck className="h-3 w-3" /> : <Bookmark className="h-3 w-3" />}
      {saved ? "Bookmarked" : "Bookmark"}
    </button>
  );
}
