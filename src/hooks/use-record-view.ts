import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ContentKind } from "@/components/site/BookmarkButton";

/**
 * Fires once per mount to log that the signed-in visitor opened this
 * piece of content — feeds the "read a story" entries on their public
 * Footsteps timeline (/footsteps/$username). Silently does nothing for
 * anonymous visitors (content_views RLS only allows inserting your own
 * row) and silently ignores a duplicate — the table's primary key is
 * (user_id, content_id, content_type), so re-opening the same piece
 * later is expected to collide and that's fine, not an error worth
 * surfacing to the reader.
 */
export function useRecordView(contentType: ContentKind, contentId: string | null | undefined) {
  const firedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!contentId || firedFor.current === contentId) return;
    firedFor.current = contentId;

    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId || cancelled) return;
      await supabase
        .from("content_views")
        .insert({ user_id: userId, content_id: contentId, content_type: contentType })
        // Ignore "already recorded" — a duplicate view is expected, not
        // a failure. Any other error is swallowed too: this is a quiet
        // background signal, not something worth interrupting a reader
        // over if it fails.
        .then(() => {}, () => {});
    })();

    return () => {
      cancelled = true;
    };
  }, [contentType, contentId]);
}
