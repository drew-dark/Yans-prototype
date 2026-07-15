import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useCollections, useVolumes, useSeasons, type TaxonomyRef } from "@/lib/taxonomy";

type Props = {
  value: TaxonomyRef;
  onChange: (next: TaxonomyRef) => void;
};

const selectCls =
  "h-10 w-full rounded border border-neutral-800 bg-neutral-900 px-3 text-sm text-white outline-none focus:border-white/40";

export function TaxonomyPicker({ value, onChange }: Props) {
  const { data: collections = [] } = useCollections();
  const { data: volumes = [] } = useVolumes(value.collection_id);
  const { data: seasons = [] } = useSeasons(value.volume_id);

  function set<K extends keyof TaxonomyRef>(k: K, v: TaxonomyRef[K]) {
    onChange({ ...value, [k]: v });
  }

  return (
    <fieldset className="space-y-3 rounded border border-white/10 bg-neutral-950/50 p-4">
      <legend className="px-1 font-mono text-[10px] uppercase tracking-widest text-white/50">
        Collection · Volume · Season · Chapter · Part
      </legend>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs text-white/60">Collection</Label>
          <select
            className={selectCls}
            value={value.collection_id ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                collection_id: e.target.value || null,
                volume_id: null,
                season_id: null,
              })
            }
          >
            <option value="">— None —</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-white/60">Volume</Label>
          <select
            className={selectCls}
            disabled={!value.collection_id}
            value={value.volume_id ?? ""}
            onChange={(e) =>
              onChange({ ...value, volume_id: e.target.value || null, season_id: null })
            }
          >
            <option value="">— None —</option>
            {volumes.map((v) => (
              <option key={v.id} value={v.id}>{v.title}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-white/60">Season</Label>
          <select
            className={selectCls}
            disabled={!value.volume_id}
            value={value.season_id ?? ""}
            onChange={(e) => set("season_id", e.target.value || null)}
          >
            <option value="">— None —</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="space-y-1">
          <Label className="text-xs text-white/60">Chapter #</Label>
          <Input
            type="number"
            step="any"
            inputMode="decimal"
            className="bg-neutral-900 border-neutral-800"
            value={value.chapter_number ?? ""}
            onChange={(e) => set("chapter_number", e.target.value === "" ? null : Number(e.target.value))}
          />
        </div>
        <div className="space-y-1 md:col-span-3">
          <Label className="text-xs text-white/60">Chapter title</Label>
          <Input
            className="bg-neutral-900 border-neutral-800"
            value={value.chapter_title ?? ""}
            onChange={(e) => set("chapter_title", e.target.value || null)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-white/60">Part #</Label>
          <Input
            type="number"
            step="any"
            inputMode="decimal"
            className="bg-neutral-900 border-neutral-800"
            value={value.part_number ?? ""}
            onChange={(e) => set("part_number", e.target.value === "" ? null : Number(e.target.value))}
          />
        </div>
        <div className="space-y-1 md:col-span-3">
          <Label className="text-xs text-white/60">Part title</Label>
          <Input
            className="bg-neutral-900 border-neutral-800"
            value={value.part_title ?? ""}
            onChange={(e) => set("part_title", e.target.value || null)}
          />
        </div>
      </div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-white/30">
        Manage collections, volumes and seasons on the Taxonomy page.
      </p>
    </fieldset>
  );
}

export const emptyTaxonomy: TaxonomyRef = {
  collection_id: null,
  volume_id: null,
  season_id: null,
  chapter_number: null,
  chapter_title: null,
  part_number: null,
  part_title: null,
};
