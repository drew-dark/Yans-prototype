import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { toast } from "sonner";
import { Trash2, Pencil, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/hero")({
  component: HeroAdmin,
});

type Item = {
  id: string;
  image_url: string;
  alt: string;
  sort_order: number;
  published: boolean;
};

const empty: Omit<Item, "id"> = {
  image_url: "",
  alt: "",
  sort_order: 0,
  published: true,
};

function HeroAdmin() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin", "hero_images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hero_images")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as Item[];
    },
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState(empty);

  function startNew() {
    setEditing(null);
    setForm({ ...empty, sort_order: items.length });
    setOpen(true);
  }
  function startEdit(item: Item) {
    setEditing(item);
    setForm({
      image_url: item.image_url,
      alt: item.alt,
      sort_order: item.sort_order,
      published: item.published,
    });
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!form.image_url) throw new Error("Image is required");
      if (editing) {
        const { error } = await supabase
          .from("hero_images")
          .update(form)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("hero_images").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "hero_images"] });
      qc.invalidateQueries({ queryKey: ["public", "hero_images"] });
      setOpen(false);
      toast.success("Saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hero_images").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "hero_images"] });
      qc.invalidateQueries({ queryKey: ["public", "hero_images"] });
      toast.success("Deleted");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl uppercase">Hero photos</h1>
          <p className="text-sm text-white/50">
            The skewed photo strip on the homepage hero.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={startNew}>
              <Plus className="mr-1 h-4 w-4" />
              New photo
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-neutral-950 text-white border-neutral-800">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit photo" : "New photo"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <ImageUpload
                folder="hero"
                label="Photo"
                value={form.image_url}
                onChange={(v) => setForm({ ...form, image_url: v })}
              />
              <div className="space-y-2">
                <Label>Alt text</Label>
                <Input
                  value={form.alt}
                  onChange={(e) => setForm({ ...form, alt: e.target.value })}
                  className="bg-neutral-900 border-neutral-800"
                />
              </div>
              <div className="space-y-2">
                <Label>Sort order</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm({ ...form, sort_order: Number(e.target.value) })
                  }
                  className="bg-neutral-900 border-neutral-800"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.published}
                  onCheckedChange={(v) => setForm({ ...form, published: v })}
                />
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
        <p className="text-white/40">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded border border-white/10 bg-neutral-900"
            >
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.alt}
                  className="h-40 w-full object-cover"
                />
              )}
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-sm">{item.alt || "—"}</p>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] uppercase ${
                      item.published
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-white/10 text-white/50"
                    }`}
                  >
                    {item.published ? "Live" : "Draft"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-white/40">Order: {item.sort_order}</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => startEdit(item)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => confirm("Delete?") && del.mutate(item.id)}
                  >
                    <Trash2 className="h-3 w-3 text-red-400" />
                  </Button>
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
