import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { toast } from "sonner";
import { Trash2, Pencil, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/gallery")({
  component: GalleryAdmin,
});

type Photo = {
  id: string;
  image_url: string;
  caption: string | null;
  tags: string[];
  sort_order: number;
  published: boolean;
};

const empty = { image_url: "", caption: "", tags: "", sort_order: 0, published: true };

function GalleryAdmin() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin", "gallery_photos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("gallery_photos").select("*").order("sort_order");
      if (error) throw error;
      return data as Photo[];
    },
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Photo | null>(null);
  const [form, setForm] = useState(empty);

  function startNew() { setEditing(null); setForm({ ...empty, sort_order: items.length }); setOpen(true); }
  function startEdit(p: Photo) {
    setEditing(p);
    setForm({
      image_url: p.image_url, caption: p.caption ?? "",
      tags: (p.tags ?? []).join(", "), sort_order: p.sort_order, published: p.published,
    });
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!form.image_url) throw new Error("Image required");
      const payload = {
        image_url: form.image_url,
        caption: form.caption,
        tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
        sort_order: form.sort_order,
        published: form.published,
      };
      if (editing) {
        const { error } = await supabase.from("gallery_photos").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("gallery_photos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "gallery_photos"] }); setOpen(false); toast.success("Saved"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gallery_photos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "gallery_photos"] }); toast.success("Deleted"); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl uppercase">Gallery</h1>
          <p className="text-sm text-white/50">Photos with captions and tags.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={startNew}><Plus className="mr-1 h-4 w-4" />New photo</Button></DialogTrigger>
          <DialogContent className="bg-neutral-950 text-white border-neutral-800">
            <DialogHeader><DialogTitle>{editing ? "Edit photo" : "New photo"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <ImageUpload folder="gallery" label="Photo" value={form.image_url} onChange={(v) => setForm({ ...form, image_url: v })} />
              <div className="space-y-2">
                <Label>Caption</Label>
                <Input value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} className="bg-neutral-900 border-neutral-800" />
              </div>
              <div className="space-y-2">
                <Label>Tags (comma-separated)</Label>
                <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="bg-neutral-900 border-neutral-800" />
              </div>
              <div className="space-y-2">
                <Label>Sort order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className="bg-neutral-900 border-neutral-800" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
                <Label>Published</Label>
              </div>
            </div>
            <DialogFooter><Button onClick={() => save.mutate()} disabled={save.isPending}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p className="text-white/40">Loading…</p> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <div key={p.id} className="group relative overflow-hidden rounded border border-white/10 bg-neutral-900">
              <img src={p.image_url} alt={p.caption ?? ""} className="h-40 w-full object-cover" />
              <div className="p-2">
                <p className="truncate text-xs text-white/70">{p.caption || "—"}</p>
                <div className="mt-2 flex gap-1">
                  <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => startEdit(p)}><Pencil className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => confirm("Delete?") && del.mutate(p.id)}><Trash2 className="h-3 w-3 text-red-400" /></Button>
                  {!p.published && <span className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[9px] uppercase text-white/60">Draft</span>}
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-white/40">No photos yet.</p>}
        </div>
      )}
    </div>
  );
}
