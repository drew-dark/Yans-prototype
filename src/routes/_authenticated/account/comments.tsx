import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/account/comments")({
  component: MyCommentsPage,
});

type Row = {
  id: string;
  body: string;
  status: "visible" | "hidden";
  content_type: string;
  content_id: string;
  created_at: string;
};

function MyCommentsPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data, error } = await supabase
      .from("comments")
      .select("id, body, status, content_type, content_id, created_at")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    setRows((data ?? []) as unknown as Row[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function del(id: string) {
    if (!confirm(t("comments.deleteConfirm"))) return;
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await load();
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl uppercase">{t("comments.myTitle")}</h1>
      {loading ? (
        <p className="text-white/40">{t("comments.loading")}</p>
      ) : rows.length === 0 ? (
        <p className="text-white/40">{t("comments.empty")}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="rounded border border-white/10 bg-neutral-900 p-3">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-white/40">
                <span>
                  {r.content_type} · {new Date(r.created_at).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-2">
                  {r.status === "hidden" && (
                    <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-red-300">
                      {t("comments.hidden")}
                    </span>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => del(r.id)}>
                    {t("comments.delete")}
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
