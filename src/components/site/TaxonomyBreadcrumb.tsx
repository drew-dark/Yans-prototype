import { Link } from "@tanstack/react-router";
import { useCollections, useVolumes, useSeasons, type TaxonomyRef } from "@/lib/taxonomy";

/**
 * "Book One › Vol. II · Wandering Home › Season 3" breadcrumb for a story or
 * diary entry that belongs to a Collection/Volume/Season. Renders nothing if
 * the piece isn't part of a collection. The collection name links to a
 * browse page listing everything published in that collection.
 */
export function TaxonomyBreadcrumb({ ref }: { ref: TaxonomyRef }) {
  const { data: collections = [] } = useCollections();
  const { data: volumes = [] } = useVolumes(ref.collection_id);
  const { data: seasons = [] } = useSeasons(ref.volume_id);

  if (!ref.collection_id) return null;

  const collection = collections.find((c) => c.id === ref.collection_id);
  const volume = volumes.find((v) => v.id === ref.volume_id);
  const season = seasons.find((s) => s.id === ref.season_id);
  if (!collection) return null;

  return (
    <nav
      aria-label="Series"
      className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] uppercase tracking-widest text-white/40"
    >
      <Link
        to="/collection/series/$slug"
        params={{ slug: collection.slug }}
        className="hover:text-white"
      >
        {collection.title}
      </Link>
      {volume && (
        <>
          <span aria-hidden="true">›</span>
          <span>{volume.title}</span>
        </>
      )}
      {season && (
        <>
          <span aria-hidden="true">›</span>
          <span>{season.title}</span>
        </>
      )}
    </nav>
  );
}
