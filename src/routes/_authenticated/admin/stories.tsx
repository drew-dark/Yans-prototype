import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { MarkdownEditor, UnsavedChangesGuard } from "@/components/admin/MarkdownEditor";
import { readingTimeMinutes } from "@/lib/markdown";
import { toast } from "sonner";
import { Trash2, Pencil, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/stories")({
  component: StoriesAdmin,
});

type Story = {
  id: string;
  title: string;
  slug: string;
  cover_image_url: string | null;
  excerpt: string | null;
  body: string | null;
  published: boolean;
  published_at: string | null;
};

const empty = { title: "", slug: "", cover_image_url: "", excerpt: "", body: "", published: false };

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function StoriesAdmin() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin", "stories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stories").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Story[];
    },
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Story | null>(null);
  const [form, setForm] = useState(empty);
  const initialRef = useRef<string>(JSON.stringify(empty));

  const dirty = useMemo(
    () => open && initialRef.current !== JSON.stringify(form),
    [open, form],
  );
  const readMins = useMemo(() => readingTimeMinutes(form.body), [form.body]);

  // Auto-fill slug from title while the slug field is empty (only for new items)
  useEffect(() => {
    if (!open || editing) return;
    setForm((f) => (f.slug ? f : { ...f, slug: slugify(f.title) }));
  }, [form.title, open, editing]);

  function startNew() {
    setEditing(null);
    setForm(empty);
    initialRef.current = JSON.stringify(empty);
    setOpen(true);
  }
  function startEdit(s: Story) {
    setEditing(s);
    const next = {
      title: s.title, slug: s.slug,
      cover_image_url: s.cover_image_url ?? "",
      excerpt: s.excerpt ?? "", body: s.body ?? "",
      published: s.published,
    };
    setForm(next);
    initialRef.current = JSON.stringify(next);
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!form.title) throw new Error("Title required");
      const slug = form.slug || slugify(form.title);
      const payload = {
        ...form,
        slug,
        published_at: form.published ? new Date().toISOString() : null,
      };
      if (editing) {
        const { error } = await supabase.from("stories").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("stories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "stories"] });
      initialRef.current = JSON.stringify(form);
      setOpen(false); toast.success("Saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("stories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "stories"] }); toast.success("Deleted"); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl uppercase">Stories</h1>
          <p className="text-sm text-white/50">Long-form posts.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={startNew}><Plus className="mr-1 h-4 w-4" />New story</Button></DialogTrigger>
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
            <DialogHeader>
              <DialogTitle>{editing ? "Edit story" : "New story"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
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
              <ImageUpload folder="stories" label="Cover image" value={form.cover_image_url} onChange={(v) => setForm({ ...form, cover_image_url: v })} />
              <div className="space-y-2">
                <Label>Excerpt</Label>
                <Textarea rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} className="bg-neutral-900 border-neutral-800" placeholder="One or two lines used in listings and social previews." />
              </div>
              <MarkdownEditor
                folder="stories"
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
          {items.map((s) => (
            <div key={s.id} className="flex items-center gap-4 rounded border border-white/10 bg-neutral-900 p-3">
              {s.cover_image_url && <img src={s.cover_image_url} alt="" className="h-16 w-16 rounded object-cover" />}
              <div className="flex-1 min-w-0">
                <p className="truncate font-mono text-sm">{s.title}</p>
                <p className="truncate text-xs text-white/40">/{s.slug}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] uppercase ${s.published ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/50"}`}>
                {s.published ? "Live" : "Draft"}
              </span>
              <Button size="sm" variant="outline" onClick={() => startEdit(s)}><Pencil className="h-3 w-3" /></Button>
              <Button size="sm" variant="ghost" onClick={() => confirm("Delete?") && del.mutate(s.id)}><Trash2 className="h-3 w-3 text-red-400" /></Button>
            </div>
          ))}
          {items.length === 0 && <p className="text-white/40">No stories yet.</p>}
        </div>
      )}
    </div>
  );
}
