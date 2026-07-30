import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Paginator } from "@/components/site/Paginator";
import { pageRangeBounds, totalPagesFor } from "@/lib/pagination";
import { toast } from "sonner";

const PAGE_SIZE = 25;

export const Route = createFileRoute("/_authenticated/admin/comments")({
  component: CommentsAdmin,
});

type Row = {
  id: string;
  user_id: string;
  body: string;
  status: "visible" | "hidden";
  content_type: string;
  content_id: string;
  created_at: string;
};

function CommentsAdmin() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "comments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments" as never)
        .select("id, user_id, body, status, content_type, content_id, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async (v: { id: string; status: "visible" | "hidden" }) => {
      const { error } = await supabase
        .from("comments" as never)
        .update({ status: v.status } as never)
        .eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "comments"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("comments" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "comments"] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase">Comments</h1>
        <p className="text-sm text-white/50">Moderate reader comments across the site.</p>
      </div>
      {isLoading ? (
        <p className="text-white/40">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-white/40">No comments yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.id}
              className={`rounded border border-white/10 bg-neutral-900 p-3 ${r.status === "hidden" ? "opacity-60" : ""}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-widest text-white/40">
                <span>
                  {r.content_type} · {r.content_id.slice(0, 8)} · {new Date(r.created_at).toLocaleString()}
                </span>
                <div className="flex items-center gap-2">
                  {r.status === "hidden" && (
                    <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-red-300">Hidden</span>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setStatus.mutate({ id: r.id, status: r.status === "visible" ? "hidden" : "visible" })
                    }
                  >
                    {r.status === "visible" ? "Hide" : "Restore"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => confirm("Delete?") && del.mutate(r.id)}>
                    Delete
                  </Button>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-white/80">{r.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
