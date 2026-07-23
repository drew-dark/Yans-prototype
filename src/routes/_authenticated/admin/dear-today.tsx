import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { MarkdownEditor, UnsavedChangesGuard } from "@/components/admin/MarkdownEditor";
import { toast } from "sonner";
import { Trash2, Pencil, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/dear-today")({
  component: DearTodayAdmin,
});

type Entry = {
  id: string;
  entry_date: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_url: string | null;
  body: string | null;
  published: boolean;
};

const empty = {
  entry_date: new Date().toISOString().slice(0, 10),
  title: "",
  slug: "",
  excerpt: "",
  cover_url: "",
  body: "",
  published: false,
};

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function DearTodayAdmin() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin", "dear_today"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dear_today" as never)
        .select("*")
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Entry[];
    },
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [form, setForm] = useState(empty);
  const initialRef = useRef<string>(JSON.stringify(empty));
  const dirty = useMemo(() => open && initialRef.current !== JSON.stringify(form), [open, form]);

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
  function startEdit(e: Entry) {
    setEditing(e);
    const next = {
      entry_date: e.entry_date,
      title: e.title,
      slug: e.slug,
      excerpt: e.excerpt ?? "",
      cover_url: e.cover_url ?? "",
      body: e.body ?? "",
      published: e.published,
    };
    setForm(next);
    initialRef.current = JSON.stringify(next);
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!form.title) throw new Error("Title required");
      const slug = form.slug || slugify(form.title);
      const payload: any = { ...form, slug };
      if (form.published && !editing?.published) payload.published_at = new Date().toISOString();
      if (editing) {
        const { error } = await supabase.from("dear_today" as never).update(payload as never).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        payload.author_id = u.user?.id ?? null;
        const { error } = await supabase.from("dear_today" as never).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "dear_today"] });
      qc.invalidateQueries({ queryKey: ["public", "dear_today"] });
      initialRef.current = JSON.stringify(form);
      setOpen(false);
      toast.success("Saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dear_today" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "dear_today"] });
      qc.invalidateQueries({ queryKey: ["public", "dear_today"] });
      toast.success("Deleted");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl uppercase">Dear Today</h1>
          <p className="text-sm text-white/50">Dated snippets in the Dear Today collection.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={startNew}>
              <Plus className="mr-1 h-4 w-4" /> New entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[92vh] overflow-y-auto bg-neutral-950 text-white border-neutral-800 sm:max-w-3xl">
            <UnsavedChangesGuard dirty={dirty} />
            <DialogHeader>
              <DialogTitle>{editing ? "Edit entry" : "New entry"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={form.entry_date}
                    onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
                    className="bg-neutral-900 border-neutral-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    className="bg-neutral-900 border-neutral-800 font-mono text-xs"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="bg-neutral-900 border-neutral-800"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Excerpt</Label>
                <Textarea
                  value={form.excerpt}
                  onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                  className="bg-neutral-900 border-neutral-800"
                />
              </div>
              <ImageUpload
                folder="dear-today"
                label="Cover"
                value={form.cover_url}
                onChange={(v) => setForm({ ...form, cover_url: v })}
              />
              <MarkdownEditor
                folder="dear-today"
                label="Body"
                value={form.body}
                onChange={(v) => setForm({ ...form, body: v })}
                rows={14}
              />
              <div className="flex items-center gap-2 border-t border-white/10 pt-3">
                <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
                <Label>Published</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending || !dirty}>
                {save.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-white/40">Loading…</p>
      ) : (
        <div className="space-y-2">
          {items.map((e) => (
            <div key={e.id} className="flex items-center gap-4 rounded border border-white/10 bg-neutral-900 p-3">
              {e.cover_url && <img src={e.cover_url} alt="" className="h-16 w-16 rounded object-cover" />}
              <div className="flex-1 min-w-0">
                <p className="truncate font-mono text-sm">{e.title}</p>
                <p className="truncate text-xs text-white/40">{e.entry_date}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] uppercase ${e.published ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/50"}`}>
                {e.published ? "Live" : "Draft"}
              </span>
              <Button size="sm" variant="outline" onClick={() => startEdit(e)}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => confirm("Delete?") && del.mutate(e.id)}>
                <Trash2 className="h-3 w-3 text-red-400" />
              </Button>
            </div>
          ))}
          {items.length === 0 && <p className="text-white/40">No entries yet.</p>}
        </div>
      )}
    </div>
  );
}
