import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trash2, Plus, ChevronRight } from "lucide-react";
import { useCollections, useVolumes, useSeasons, type Collection, type Volume, type Season } from "@/lib/taxonomy";

export const Route = createFileRoute("/_authenticated/admin/taxonomy")({
  component: TaxonomyAdmin,
});

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

type NewNode = { title: string; slug: string; description: string; sort_order: number };
const emptyNode: NewNode = { title: "", slug: "", description: "", sort_order: 0 };

function TaxonomyAdmin() {
  const [colId, setColId] = useState<string | null>(null);
  const [volId, setVolId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase">Taxonomy</h1>
        <p className="text-sm text-white/50">
          Organise stories & diary entries into Collections → Volumes → Seasons.
          Chapter and Part numbers live on each entry.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <CollectionsPane selected={colId} onSelect={(id) => { setColId(id); setVolId(null); }} />
        <VolumesPane collectionId={colId} selected={volId} onSelect={setVolId} />
        <SeasonsPane volumeId={volId} />
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-white/10 bg-neutral-900/60 p-4">
      <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-white/50">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function NewRowForm({ onCreate, disabled }: { onCreate: (v: NewNode) => void; disabled?: boolean }) {
  const [n, setN] = useState<NewNode>(emptyNode);
  return (
    <div className="space-y-2 rounded border border-dashed border-white/10 p-3">
      <div className="grid gap-2 md:grid-cols-[1fr_100px]">
        <Input
          placeholder="Title"
          disabled={disabled}
          value={n.title}
          onChange={(e) => setN({ ...n, title: e.target.value, slug: n.slug || slugify(e.target.value) })}
          className="bg-neutral-950 border-neutral-800"
        />
        <Input
          type="number"
          placeholder="Order"
          disabled={disabled}
          value={n.sort_order}
          onChange={(e) => setN({ ...n, sort_order: Number(e.target.value) })}
          className="bg-neutral-950 border-neutral-800"
        />
      </div>
      <Input
        placeholder="slug"
        disabled={disabled}
        value={n.slug}
        onChange={(e) => setN({ ...n, slug: e.target.value })}
        className="bg-neutral-950 border-neutral-800 font-mono text-xs"
      />
      <Textarea
        rows={2}
        placeholder="Optional description"
        disabled={disabled}
        value={n.description}
        onChange={(e) => setN({ ...n, description: e.target.value })}
        className="bg-neutral-950 border-neutral-800"
      />
      <Button
        size="sm"
        disabled={disabled || !n.title}
        onClick={() => { onCreate(n); setN(emptyNode); }}
      >
        <Plus className="mr-1 h-3 w-3" /> Add
      </Button>
    </div>
  );
}

type Row = Collection | Volume | Season;

function RowItem({
  row,
  active,
  onSelect,
  onDelete,
  onUpdate,
  showChevron,
}: {
  row: Row;
  active?: boolean;
  onSelect?: () => void;
  onDelete: () => void;
  onUpdate: (patch: Partial<Row>) => void;
  showChevron?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(row.title);
  const [order, setOrder] = useState(row.sort_order);

  function commit() {
    setEditing(false);
    const patch: Partial<Row> = {};
    if (title !== row.title) patch.title = title;
    if (order !== row.sort_order) patch.sort_order = order;
    if (Object.keys(patch).length) onUpdate(patch);
  }

  return (
    <div className={`flex items-center gap-2 rounded border p-2 ${active ? "border-white/50 bg-white/5" : "border-white/10 bg-neutral-950"}`}>
      <Input
        type="number"
        value={order}
        onChange={(e) => { setOrder(Number(e.target.value)); setEditing(true); }}
        onBlur={commit}
        className="h-8 w-14 bg-neutral-900 border-neutral-800 text-xs"
        aria-label="Sort order"
      />
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 truncate text-left text-sm hover:text-white"
      >
        <Input
          value={title}
          onChange={(e) => { setTitle(e.target.value); setEditing(true); }}
          onBlur={commit}
          onClick={(e) => e.stopPropagation()}
          className="h-8 bg-neutral-900 border-neutral-800 text-sm"
        />
      </button>
      {showChevron && (
        <button type="button" onClick={onSelect} aria-label="Open" className="text-white/40 hover:text-white">
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
      <Button size="sm" variant="ghost" onClick={() => confirm("Delete? Nested items will also be removed.") && onDelete()}>
        <Trash2 className="h-3 w-3 text-red-400" />
      </Button>
    </div>
  );
}

function CollectionsPane({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
  const qc = useQueryClient();
  const { data = [], isLoading } = useCollections();
  const create = useMutation({
    mutationFn: async (n: NewNode) => {
      const slug = n.slug || slugify(n.title);
      const { error } = await (supabase as any).from("collections").insert({ ...n, slug });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["taxonomy", "collections"] }); toast.success("Collection added"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Collection> }) => {
      const { error } = await (supabase as any).from("collections").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["taxonomy", "collections"] }),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("collections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["taxonomy"] });
      toast.success("Deleted");
    },
  });
  return (
    <Panel title="Collections">
      {isLoading && <p className="text-white/40 text-sm">Loading…</p>}
      {data.map((c) => (
        <RowItem
          key={c.id}
          row={c}
          active={selected === c.id}
          onSelect={() => onSelect(c.id)}
          onDelete={() => del.mutate(c.id)}
          onUpdate={(patch) => update.mutate({ id: c.id, patch })}
          showChevron
        />
      ))}
      {!data.length && !isLoading && <p className="text-white/40 text-sm">No collections yet.</p>}
      <NewRowForm onCreate={(n) => create.mutate(n)} />
    </Panel>
  );
}

function VolumesPane({ collectionId, selected, onSelect }: { collectionId: string | null; selected: string | null; onSelect: (id: string) => void }) {
  const qc = useQueryClient();
  const { data = [], isLoading } = useVolumes(collectionId);
  const create = useMutation({
    mutationFn: async (n: NewNode) => {
      if (!collectionId) throw new Error("Select a collection first");
      const slug = n.slug || slugify(n.title);
      const { error } = await (supabase as any).from("volumes").insert({ ...n, slug, collection_id: collectionId });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["taxonomy", "volumes", collectionId] }); toast.success("Volume added"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Volume> }) => {
      const { error } = await (supabase as any).from("volumes").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["taxonomy", "volumes", collectionId] }),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("volumes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["taxonomy"] }); toast.success("Deleted"); },
  });
  return (
    <Panel title={collectionId ? "Volumes" : "Volumes (pick a collection)"}>
      {!collectionId && <p className="text-white/40 text-sm">Select a collection to manage its volumes.</p>}
      {collectionId && (
        <>
          {isLoading && <p className="text-white/40 text-sm">Loading…</p>}
          {data.map((v) => (
            <RowItem
              key={v.id}
              row={v}
              active={selected === v.id}
              onSelect={() => onSelect(v.id)}
              onDelete={() => del.mutate(v.id)}
              onUpdate={(patch) => update.mutate({ id: v.id, patch })}
              showChevron
            />
          ))}
          {!data.length && !isLoading && <p className="text-white/40 text-sm">No volumes yet.</p>}
          <NewRowForm onCreate={(n) => create.mutate(n)} disabled={!collectionId} />
        </>
      )}
    </Panel>
  );
}

function SeasonsPane({ volumeId }: { volumeId: string | null }) {
  const qc = useQueryClient();
  const { data = [], isLoading } = useSeasons(volumeId);
  const create = useMutation({
    mutationFn: async (n: NewNode) => {
      if (!volumeId) throw new Error("Select a volume first");
      const slug = n.slug || slugify(n.title);
      const { error } = await (supabase as any).from("seasons").insert({ ...n, slug, volume_id: volumeId });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["taxonomy", "seasons", volumeId] }); toast.success("Season added"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Season> }) => {
      const { error } = await (supabase as any).from("seasons").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["taxonomy", "seasons", volumeId] }),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("seasons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["taxonomy"] }); toast.success("Deleted"); },
  });
  return (
    <Panel title={volumeId ? "Seasons" : "Seasons (pick a volume)"}>
      {!volumeId && <p className="text-white/40 text-sm">Select a volume to manage its seasons.</p>}
      {volumeId && (
        <>
          {isLoading && <p className="text-white/40 text-sm">Loading…</p>}
          {data.map((s) => (
            <RowItem
              key={s.id}
              row={s}
              onDelete={() => del.mutate(s.id)}
              onUpdate={(patch) => update.mutate({ id: s.id, patch })}
            />
          ))}
          {!data.length && !isLoading && <p className="text-white/40 text-sm">No seasons yet.</p>}
          <NewRowForm onCreate={(n) => create.mutate(n)} disabled={!volumeId} />
        </>
      )}
    </Panel>
  );
}
