import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/account/bookmarks")({
  component: BookmarksPage,
});

type Row = {
  id: string;
  content_type: "story" | "diary" | "collection_item" | "gallery" | "dear_today";
  content_id: string;
  created_at: string;
  meta?: { title: string; slug?: string | null; image_url?: string | null } | null;
};

const TABLES: Record<Row["content_type"], { table: string; select: string; toPath: (r: any) => string; label: string }> = {
  story: { table: "stories", select: "id, title, slug, cover_image_url", toPath: (r) => `/stories/${r.slug}`, label: "Story" },
  diary: { table: "diary_entries", select: "id, title, slug, cover_image_url", toPath: (r) => `/diaries/${r.slug}`, label: "Diary" },
  collection_item: { table: "collection_items", select: "id, label, image_url", toPath: () => `/collection`, label: "Collection" },
  gallery: { table: "gallery_photos", select: "id, caption, image_url", toPath: () => `/gallery`, label: "Gallery" },
  dear_today: { table: "dear_today", select: "id, title, slug, cover_url", toPath: (r) => `/collection/dear-today/${r.slug}`, label: "Dear Today" },
};

function BookmarksPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data, error } = await supabase
      .from("bookmarks" as never)
      .select("id, content_type, content_id, created_at")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const base = (data ?? []) as unknown as Row[];
    // fetch meta per content type
    const grouped = new Map<string, string[]>();
    for (const r of base) {
      const arr = grouped.get(r.content_type) ?? [];
      arr.push(r.content_id);
      grouped.set(r.content_type, arr);
    }
    const metaByKey = new Map<string, any>();
    await Promise.all(
      Array.from(grouped.entries()).map(async ([kind, ids]) => {
        const cfg = TABLES[kind as Row["content_type"]];
        const { data: items } = await supabase
          .from(cfg.table as never)
          .select(cfg.select)
          .in("id", ids);
        for (const it of ((items ?? []) as unknown as any[])) {
          metaByKey.set(`${kind}:${it.id}`, it);
        }
      }),
    );
    setRows(
      base.map((r) => {
        const m = metaByKey.get(`${r.content_type}:${r.content_id}`);
        if (!m) return { ...r, meta: null };
        return {
          ...r,
          meta: {
            title: m.title ?? m.label ?? m.caption ?? "Untitled",
            slug: m.slug ?? null,
            image_url: m.image_url ?? m.cover_image_url ?? m.cover_url ?? null,
          },
        };
      }),
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(id: string) {
    const { error } = await supabase.from("bookmarks" as never).delete().eq("id", id);
    if (error) return toast.error(error.message);
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase">Your bookmarks</h1>
        <p className="text-sm text-white/50">Saved stories, diaries, and more.</p>
      </div>
      {loading ? (
        <p className="text-white/40">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-white/40">Nothing saved yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const cfg = TABLES[r.content_type];
            const meta = r.meta;
            return (
              <div key={r.id} className="flex items-center gap-4 rounded border border-white/10 bg-neutral-900 p-3">
                {meta?.image_url && (
                  <img src={meta.image_url} alt="" className="h-14 w-14 rounded object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm">{meta?.title ?? "(removed)"}</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                    {cfg.label}
                  </p>
                </div>
                {meta && (
                  <Link
                    to={cfg.toPath({ slug: meta.slug })}
                    className="font-mono text-[10px] uppercase tracking-widest text-white/60 hover:text-white"
                  >
                    Open →
                  </Link>
                )}
                <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                  Remove
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
