import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { isGoogleDriveUrl } from "@/lib/media";
import { toast } from "sonner";
import { Trash2, Pencil, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/footprints")({
  component: FootprintsAdmin,
});

const CATEGORIES = ["news", "video", "project"] as const;

type Footprint = {
  id: string;
  title: string;
  category: string;
  role_or_outlet: string | null;
  description: string | null;
  occurred_on: string | null;
  media_url: string | null;
  external_url: string | null;
  cover_url: string | null;
  tags: string[];
  sort_order: number;
  published: boolean;
};

const empty = {
  title: "",
  category: "project" as string,
  role_or_outlet: "",
  description: "",
  occurred_on: "",
  media_url: "",
  external_url: "",
  cover_url: "",
  tags: "",
  sort_order: 0,
  published: true,
};

function FootprintsAdmin() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin", "footprints"],
    queryFn: async () => {
      const { data, error } = await supabase.from("footprints").select("*").order("sort_order");
      if (error) throw error;
      return data as Footprint[];
    },
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Footprint | null>(null);
  const [form, setForm] = useState(empty);

  function startNew() {
    setEditing(null);
    setForm({ ...empty, sort_order: items.length });
    setOpen(true);
  }

  function startEdit(item: Footprint) {
    setEditing(item);
    setForm({
      title: item.title,
      category: item.category,
      role_or_outlet: item.role_or_outlet ?? "",
      description: item.description ?? "",
      occurred_on: item.occurred_on ?? "",
      media_url: item.media_url ?? "",
      external_url: item.external_url ?? "",
      cover_url: item.cover_url ?? "",
      tags: (item.tags ?? []).join(", "),
      sort_order: item.sort_order,
      published: item.published,
    });
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!form.title) throw new Error("Title required");
      const payload = {
        title: form.title,
        category: form.category,
        role_or_outlet: form.role_or_outlet || null,
        description: form.description || null,
        occurred_on: form.occurred_on || null,
        media_url: form.media_url || null,
        external_url: form.external_url || null,
        cover_url: form.cover_url || null,
        tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
        sort_order: form.sort_order,
        published: form.published,
      };
      if (editing) {
        const { error } = await supabase.from("footprints").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("footprints").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "footprints"] });
      setOpen(false);
      toast.success("Saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("footprints").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "footprints"] });
      toast.success("Deleted");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl uppercase">Footprints</h1>
          <p className="text-sm text-white/50">
            Past work — news, creator videos, and other projects. Attach media by uploading a
            file, or pasting a YouTube, Google Drive, or direct link.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={startNew}>
              <Plus className="mr-1 h-4 w-4" />
              New entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto bg-neutral-950 text-white border-neutral-800">
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
                  <Label>Category</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm({ ...form, category: v })}
                  >
                    <SelectTrigger className="bg-neutral-900 border-neutral-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={form.occurred_on}
                    onChange={(e) => setForm({ ...form, occurred_on: e.target.value })}
                    className="bg-neutral-900 border-neutral-800"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Role / outlet</Label>
                <Input
                  placeholder="e.g. NHK World, Solo project, Client: Acme"
                  value={form.role_or_outlet}
                  onChange={(e) => setForm({ ...form, role_or_outlet: e.target.value })}
                  className="bg-neutral-900 border-neutral-800"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="bg-neutral-900 border-neutral-800"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <ImageUpload
                  folder="footprints"
                  label="Media (upload, or paste a YouTube / Google Drive / direct link)"
                  value={form.media_url}
                  onChange={(v) => setForm({ ...form, media_url: v })}
                />
                {isGoogleDriveUrl(form.media_url) && (
                  <p className="font-mono text-[10px] uppercase tracking-widest text-amber-400/80">
                    Google Drive file must be shared as "Anyone with the link can view" to
                    display publicly.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Cover image override (optional)</Label>
                <Input
                  placeholder="Leave blank to auto-generate a thumbnail where possible"
                  value={form.cover_url}
                  onChange={(e) => setForm({ ...form, cover_url: e.target.value })}
                  className="bg-neutral-900 border-neutral-800"
                />
              </div>

              <div className="space-y-2">
                <Label>External link (optional — "read/watch the original")</Label>
                <Input
                  value={form.external_url}
                  onChange={(e) => setForm({ ...form, external_url: e.target.value })}
                  className="bg-neutral-900 border-neutral-800"
                />
              </div>

              <div className="space-y-2">
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  className="bg-neutral-900 border-neutral-800"
                />
              </div>

              <div className="space-y-2">
                <Label>Sort order</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="group relative overflow-hidden rounded border border-white/10 bg-neutral-900 p-3"
            >
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-kraft">
                <span>{item.category}</span>
                {item.occurred_on && <span className="text-white/40">· {item.occurred_on}</span>}
              </div>
              <p className="mt-1 truncate text-sm text-white/90">{item.title}</p>
              {item.role_or_outlet && (
                <p className="truncate text-xs text-white/50">{item.role_or_outlet}</p>
              )}
              <div className="mt-2 flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2"
                  onClick={() => startEdit(item)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={() => confirm("Delete?") && del.mutate(item.id)}
                >
                  <Trash2 className="h-3 w-3 text-red-400" />
                </Button>
                {!item.published && (
                  <span className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[9px] uppercase text-white/60">
                    Draft
                  </span>
                )}
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-white/40">No entries yet.</p>}
        </div>
      )}
    </div>
  );
}
