import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { toast } from "sonner";
import { Trash2, Pencil, Plus, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/collections")({
  component: CollectionsAdmin,
});

type Collection = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  sort_order: number;
};

type Entry = {
  id: string;
  collection_id: string;
  slug: string;
  title: string;
  cover_url: string | null;
  entry_date: string;
  body: string | null;
  sort_order: number;
  published: boolean;
};

type MediaRow = { id?: string; kind: string; url: string; caption: string };

const MEDIA_KINDS = ["image", "video", "audio", "pdf", "attachment"] as const;

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// ---------- Collections list + editor ----------

function CollectionsAdmin() {
  const qc = useQueryClient();
  const { data: collections = [], isLoading } = useQuery({
    queryKey: ["admin", "collections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("collections").select("*").order("sort_order");
      if (error) throw error;
      return data as Collection[];
    },
  });

  const [selected, setSelected] = useState<Collection | null>(null);
  const [colOpen, setColOpen] = useState(false);
  const [editingCol, setEditingCol] = useState<Collection | null>(null);
  const [colForm, setColForm] = useState({ title: "", slug: "", description: "", cover_url: "", sort_order: 0 });

  function startNewCollection() {
    setEditingCol(null);
    setColForm({ title: "", slug: "", description: "", cover_url: "", sort_order: collections.length });
    setColOpen(true);
  }
  function startEditCollection(c: Collection) {
    setEditingCol(c);
    setColForm({ title: c.title, slug: c.slug, description: c.description ?? "", cover_url: c.cover_url ?? "", sort_order: c.sort_order });
    setColOpen(true);
  }

  const saveCollection = useMutation({
    mutationFn: async () => {
      if (!colForm.title) throw new Error("Title required");
      const slug = colForm.slug || slugify(colForm.title);
      const payload = {
        title: colForm.title,
        slug,
        description: colForm.description || null,
        cover_url: colForm.cover_url || null,
        sort_order: colForm.sort_order,
      };
      if (editingCol) {
        const { error } = await supabase.from("collections").update(payload).eq("id", editingCol.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("collections").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "collections"] });
      setColOpen(false);
      toast.success("Saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const deleteCollection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("collections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "collections"] });
      if (selected) setSelected(null);
      toast.success("Deleted");
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl uppercase">Collections</h1>
            <p className="text-sm text-white/50">
              The Library grid at /collection. Dear Today shows here too but always links to its
              own existing pages, not a generic collection home.
            </p>
          </div>
          <Dialog open={colOpen} onOpenChange={setColOpen}>
            <DialogTrigger asChild>
              <Button onClick={startNewCollection}>
                <Plus className="mr-1 h-4 w-4" /> New collection
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-neutral-950 text-white border-neutral-800">
              <DialogHeader>
                <DialogTitle>{editingCol ? "Edit collection" : "New collection"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={colForm.title}
                    onChange={(e) => setColForm({ ...colForm, title: e.target.value })}
                    className="bg-neutral-900 border-neutral-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug (used in the URL — leave blank to generate from title)</Label>
                  <Input
                    value={colForm.slug}
                    onChange={(e) => setColForm({ ...colForm, slug: slugify(e.target.value) })}
                    placeholder={slugify(colForm.title) || "muyan"}
                    className="bg-neutral-900 border-neutral-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={colForm.description}
                    onChange={(e) => setColForm({ ...colForm, description: e.target.value })}
                    className="bg-neutral-900 border-neutral-800"
                    rows={3}
                  />
                </div>
                <ImageUpload
                  folder="collections"
                  label="Cover image"
                  value={colForm.cover_url}
                  onChange={(v) => setColForm({ ...colForm, cover_url: v })}
                />
                <div className="space-y-2">
                  <Label>Sort order</Label>
                  <Input
                    type="number"
                    value={colForm.sort_order}
                    onChange={(e) => setColForm({ ...colForm, sort_order: Number(e.target.value) })}
                    className="bg-neutral-900 border-neutral-800"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => saveCollection.mutate()} disabled={saveCollection.isPending}>
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <p className="mt-4 text-white/40">Loading…</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((c) => (
              <div
                key={c.id}
                className={`rounded border p-4 text-left transition-colors ${
                  selected?.id === c.id ? "border-kraft bg-white/[0.06]" : "border-white/12 hover:border-white/30"
                }`}
              >
                <button type="button" onClick={() => setSelected(c)} className="block w-full text-left">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">/{c.slug}</p>
                  <p className="mt-1 text-sm text-white/90">{c.title}</p>
                </button>
                <div className="mt-2 flex gap-1">
                  <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => startEditCollection(c)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => confirm("Delete this collection and all its entries?") && deleteCollection.mutate(c.id)}
                  >
                    <Trash2 className="h-3 w-3 text-red-400" />
                  </Button>
                </div>
              </div>
            ))}
            {collections.length === 0 && <p className="text-white/40">No collections yet.</p>}
          </div>
        )}
      </div>

      {selected && <EntriesAdmin collection={selected} />}
    </div>
  );
}

// ---------- Entries (within a selected collection) ----------

function EntriesAdmin({ collection }: { collection: Collection }) {
  const qc = useQueryClient();
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["admin", "collection-entries", collection.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_entries")
        .select("*")
        .eq("collection_id", collection.id)
        .order("sort_order");
      if (error) throw error;
      return data as Entry[];
    },
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    cover_url: "",
    entry_date: new Date().toISOString().slice(0, 10),
    body: "",
    sort_order: 0,
    published: true,
  });
  const [mediaRows, setMediaRows] = useState<MediaRow[]>([]);

  function startNew() {
    setEditing(null);
    setForm({
      title: "",
      slug: "",
      cover_url: "",
      entry_date: new Date().toISOString().slice(0, 10),
      body: "",
      sort_order: entries.length,
      published: true,
    });
    setMediaRows([]);
    setOpen(true);
  }

  async function startEdit(entry: Entry) {
    setEditing(entry);
    setForm({
      title: entry.title,
      slug: entry.slug,
      cover_url: entry.cover_url ?? "",
      entry_date: entry.entry_date,
      body: entry.body ?? "",
      sort_order: entry.sort_order,
      published: entry.published,
    });
    const { data } = await supabase
      .from("collection_entry_media")
      .select("id, kind, url, caption")
      .eq("entry_id", entry.id)
      .order("sort_order");
    setMediaRows((data ?? []).map((m) => ({ id: m.id, kind: m.kind, url: m.url, caption: m.caption ?? "" })));
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!form.title) throw new Error("Title required");
      const slug = form.slug || slugify(form.title);
      const payload = {
        collection_id: collection.id,
        title: form.title,
        slug,
        cover_url: form.cover_url || null,
        entry_date: form.entry_date,
        body: form.body || null,
        sort_order: form.sort_order,
        published: form.published,
      };
      let entryId = editing?.id;
      if (editing) {
        const { error } = await supabase.from("collection_entries").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("collection_entries").insert(payload).select("id").single();
        if (error) throw error;
        entryId = data.id;
      }
      // Replace media rows: delete existing, re-insert current list. Simple
      // and correct for the admin's scale; not built for high-frequency edits.
      if (editing) {
        await supabase.from("collection_entry_media").delete().eq("entry_id", entryId!);
      }
      const validRows = mediaRows.filter((m) => m.url);
      if (validRows.length > 0) {
        const { error } = await supabase.from("collection_entry_media").insert(
          validRows.map((m, i) => ({
            entry_id: entryId!,
            kind: m.kind,
            url: m.url,
            caption: m.caption || null,
            sort_order: i,
          })),
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "collection-entries", collection.id] });
      setOpen(false);
      toast.success("Saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("collection_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "collection-entries", collection.id] });
      toast.success("Deleted");
    },
  });

  return (
    <div className="border-t border-white/10 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl uppercase">Entries in “{collection.title}”</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={startNew}>
              <Plus className="mr-1 h-4 w-4" /> New entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto bg-neutral-950 text-white border-neutral-800 sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit entry" : "New entry"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="bg-neutral-900 border-neutral-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Slug (blank = from title)</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                    placeholder={slugify(form.title)}
                    className="bg-neutral-900 border-neutral-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={form.entry_date}
                    onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
                    className="bg-neutral-900 border-neutral-800"
                  />
                </div>
              </div>
              <ImageUpload
                folder="collection-entries"
                label="Cover image"
                value={form.cover_url}
                onChange={(v) => setForm({ ...form, cover_url: v })}
              />
              <div className="space-y-2">
                <Label>Body (optional — markdown)</Label>
                <Textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  className="bg-neutral-900 border-neutral-800"
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Media (images, video, audio, PDFs, attachments)</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setMediaRows([...mediaRows, { kind: "image", url: "", caption: "" }])}
                  >
                    <Plus className="mr-1 h-3 w-3" /> Add media
                  </Button>
                </div>
                {mediaRows.map((row, i) => (
                  <div key={i} className="flex items-start gap-2 border border-white/10 p-2">
                    <Select value={row.kind} onValueChange={(v) => setMediaRows(mediaRows.map((m, j) => (j === i ? { ...m, kind: v } : m)))}>
                      <SelectTrigger className="w-32 shrink-0 bg-neutral-900 border-neutral-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MEDIA_KINDS.map((k) => (
                          <SelectItem key={k} value={k}>{k}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex-1 space-y-1.5">
                      <Input
                        placeholder="URL (paste a link, or upload separately and paste the URL)"
                        value={row.url}
                        onChange={(e) => setMediaRows(mediaRows.map((m, j) => (j === i ? { ...m, url: e.target.value } : m)))}
                        className="bg-neutral-900 border-neutral-800"
                      />
                      <Input
                        placeholder="Caption (optional)"
                        value={row.caption}
                        onChange={(e) => setMediaRows(mediaRows.map((m, j) => (j === i ? { ...m, caption: e.target.value } : m)))}
                        className="bg-neutral-900 border-neutral-800"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="shrink-0"
                      onClick={() => setMediaRows(mediaRows.filter((_, j) => j !== i))}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
                <Label>Published</Label>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="mt-4 text-white/40">Loading…</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <div key={entry.id} className="rounded border border-white/12 p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">{entry.entry_date}</p>
              <p className="mt-1 truncate text-sm text-white/90">{entry.title}</p>
              <div className="mt-2 flex gap-1">
                <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => startEdit(entry)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={() => confirm("Delete?") && del.mutate(entry.id)}
                >
                  <Trash2 className="h-3 w-3 text-red-400" />
                </Button>
                {!entry.published && (
                  <span className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[9px] uppercase text-white/60">Draft</span>
                )}
              </div>
            </div>
          ))}
          {entries.length === 0 && <p className="text-white/40">No entries yet.</p>}
        </div>
      )}
    </div>
  );
}
