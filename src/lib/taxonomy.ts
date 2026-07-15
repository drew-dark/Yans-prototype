import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export type Collection = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  sort_order: number;
};
export type Volume = Collection & { collection_id: string };
export type Season = Collection & { volume_id: string };

export type TaxonomyRef = {
  collection_id: string | null;
  volume_id: string | null;
  season_id: string | null;
  chapter_number: number | null;
  chapter_title: string | null;
  part_number: number | null;
  part_title: string | null;
};

function romanize(n: number) {
  if (!Number.isFinite(n) || n <= 0 || n > 3999) return String(n);
  const map: [number, string][] = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let r = "";
  let v = Math.floor(n);
  for (const [num, sym] of map) while (v >= num) { r += sym; v -= num; }
  return r;
}

/** Compact label like "Vol. II · Season 3 · Chapter 4.1 — Sub" */
export function formatTaxonomyLabel(
  ref: Partial<TaxonomyRef>,
  lookups: {
    collections?: Collection[];
    volumes?: Volume[];
    seasons?: Season[];
  } = {},
): string {
  const parts: string[] = [];
  const col = lookups.collections?.find((c) => c.id === ref.collection_id);
  const vol = lookups.volumes?.find((v) => v.id === ref.volume_id);
  const sea = lookups.seasons?.find((s) => s.id === ref.season_id);
  if (col) parts.push(col.title);
  if (vol) parts.push(`Vol. ${romanize(vol.sort_order || 1)} · ${vol.title}`);
  if (sea) parts.push(`Season ${sea.sort_order || 1}`);
  const ch = ref.chapter_number;
  const pt = ref.part_number;
  if (ch != null) {
    let s = `Chapter ${ch}`;
    if (pt != null) s += `.${pt}`;
    if (ref.chapter_title) s += ` — ${ref.chapter_title}`;
    parts.push(s);
  }
  if (ref.part_title && pt != null && !ref.chapter_title) {
    parts.push(ref.part_title);
  }
  return parts.join(" · ");
}

export function useCollections() {
  return useQuery({
    queryKey: ["taxonomy", "collections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections" as never)
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Collection[];
    },
  });
}

export function useVolumes(collectionId: string | null | undefined) {
  return useQuery({
    queryKey: ["taxonomy", "volumes", collectionId],
    enabled: !!collectionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("volumes" as never)
        .select("*")
        .eq("collection_id", collectionId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Volume[];
    },
  });
}

export function useSeasons(volumeId: string | null | undefined) {
  return useQuery({
    queryKey: ["taxonomy", "seasons", volumeId],
    enabled: !!volumeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seasons" as never)
        .select("*")
        .eq("volume_id", volumeId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Season[];
    },
  });
}
