import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { MarkdownEditor, UnsavedChangesGuard } from "@/components/admin/MarkdownEditor";
import { TaxonomyPicker, emptyTaxonomy } from "@/components/admin/TaxonomyPicker";
import { readingTimeMinutes } from "@/lib/markdown";
import type { TaxonomyRef } from "@/lib/taxonomy";
import { toast } from "sonner";
import { Trash2, Pencil, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/diary")({
  component: DiaryAdmin,
});

type Entry = {
  id: string;
  title: string;
  slug: string;
  entry_date: string;
  location: string | null;
  cover_image_url: string | null;
  body: string | null;
  published: boolean;
} & Partial<TaxonomyRef>;

const empty = { title: "", slug: "", entry_date: new Date().toISOString().slice(0, 10), location: "", cover_image_url: "", body: "", published: false, ...emptyTaxonomy };

function slugify(s: string) {
  const base = s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  // A title written entirely in a non-Latin script (e.g. Japanese) strips
  // down to nothing here — fall back to a random slug rather than saving
  // an empty one, which breaks the entry's URL and read page.
  return base || `entry-${Math.random().toString(36).slice(2, 8)}`;
}

function DiaryAdmin() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin", "diary_entries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("diary_entries").select("*").order("entry_date", { ascending: false });
      if (error) throw error;
      return data as Entry[];
    },
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [form, setForm] = useState(empty);
  const initialRef = useRef<string>(JSON.stringify(empty));
  const dirty = useMemo(() => open && initialRef.current !== JSON.stringify(form), [open, form]);
  const readMins = useMemo(() => readingTimeMinutes(form.body), [form.body]);

  useEffect(() => {
    if (!open || editing) return;
    setForm((f) => (f.slug ? f : { ...f, slug: slugify(f.title) }));
  }, [form.title, open, editing]);

  function startNew() { setEditing(null); setForm(empty); initialRef.current = JSON.stringify(empty); setOpen(true); }
  function startEdit(e: Entry) {
    setEditing(e);
    const next = {
      title: e.title, slug: e.slug, entry_date: e.entry_date,
      location: e.location ?? "", cover_image_url: e.cover_image_url ?? "",
      body: e.body ?? "", published: e.published,
      collection_id: e.collection_id ?? null,
      volume_id: e.volume_id ?? null,
      season_id: e.season_id ?? null,
      chapter_number: e.chapter_number ?? null,
      chapter_title: e.chapter_title ?? null,
      part_number: e.part_number ?? null,
      part_title: e.part_title ?? null,
    };
    setForm(next);
    initialRef.current = JSON.stringify(next);
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!form.title) throw new Error("Title required");
      const slug = form.slug || slugify(form.title);
      const payload = { ...form, slug };
      if (editing) {
        const { error } = await supabase.from("diary_entries").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("diary_entries").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "diary_entries"] });
      initialRef.current = JSON.stringify(form);
      setOpen(false);
      toast.success("Saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("diary_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "diary_entries"] }); toast.success("Deleted"); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl uppercase">Gaijin Diaries</h1>
          <p className="text-sm text-white/50">Dated entries from the road.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={startNew}><Plus className="mr-1 h-4 w-4" />New entry</Button></DialogTrigger>
          <DialogContent
            className="max-h-[92vh] overflow-y-auto bg-neutral-950 text-white border-neutral-800 sm:max-w-3xl"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
                e.preventDefault();
                if (!save.isPending) save.mutate();
              }
            }}
          >
            <UnsavedChangesGuard dirty={dirty} />
            <DialogHeader><DialogTitle>{editing ? "Edit entry" : "New entry"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} className="bg-neutral-900 border-neutral-800" />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Tokyo, Japan" className="bg-neutral-900 border-neutral-800" />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_260px]">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-neutral-900 border-neutral-800" autoFocus />
                </div>
                <div className="space-y-2">
                  <Label>Slug <span className="text-white/40">(auto)</span></Label>
                  <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="bg-neutral-900 border-neutral-800 font-mono text-xs" />
                </div>
              </div>
              <ImageUpload folder="diary" label="Cover image" value={form.cover_image_url} onChange={(v) => setForm({ ...form, cover_image_url: v })} />
              <TaxonomyPicker
                value={{
                  collection_id: form.collection_id, volume_id: form.volume_id, season_id: form.season_id,
                  chapter_number: form.chapter_number, chapter_title: form.chapter_title,
                  part_number: form.part_number, part_title: form.part_title,
                }}
                onChange={(t) => setForm({ ...form, ...t })}
              />
              <MarkdownEditor
                folder="diary"
                label="Body"
                value={form.body}
                onChange={(v) => setForm({ ...form, body: v })}
                rows={16}
              />
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
                <div className="flex items-center gap-2">
                  <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
                  <Label>Published</Label>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                  {readMins} min read · {dirty ? "Unsaved" : "Saved"}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending || !dirty}>
                {save.isPending ? "Saving…" : "Save (⌘S)"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p className="text-white/40">Loading…</p> : (
        <div className="space-y-2">
          {items.map((e) => (
            <div key={e.id} className="flex items-center gap-4 rounded border border-white/10 bg-neutral-900 p-3">
              {e.cover_image_url && <img src={e.cover_image_url} alt="" className="h-16 w-16 rounded object-cover" />}
              <div className="flex-1 min-w-0">
                <p className="truncate font-mono text-sm">{e.title}</p>
                <p className="truncate text-xs text-white/40">{e.entry_date} · {e.location}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] uppercase ${e.published ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/50"}`}>
                {e.published ? "Live" : "Draft"}
              </span>
              <Button size="sm" variant="outline" onClick={() => startEdit(e)}><Pencil className="h-3 w-3" /></Button>
              <Button size="sm" variant="ghost" onClick={() => confirm("Delete?") && del.mutate(e.id)}><Trash2 className="h-3 w-3 text-red-400" /></Button>
            </div>
          ))}
          {items.length === 0 && <p className="text-white/40">No entries yet.</p>}
        </div>
      )}
    </div>
  );
}
