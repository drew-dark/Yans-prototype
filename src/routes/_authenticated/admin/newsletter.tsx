import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, Mail, MailCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/newsletter")({
  component: NewsletterAdmin,
});

type Subscriber = {
  id: string;
  email: string;
  source: string | null;
  confirmed: boolean;
  confirmed_at: string | null;
  unsubscribed_at: string | null;
  created_at: string;
};

function NewsletterAdmin() {
  const qc = useQueryClient();
  const { data: subscribers = [], isLoading } = useQuery({
    queryKey: ["admin", "newsletter_subscribers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_subscribers")
        .select("id, email, source, confirmed, confirmed_at, unsubscribed_at, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Subscriber[];
    },
  });

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "confirmed" | "unconfirmed" | "unsubscribed"
  >("all");

  const term = q.trim().toLowerCase();
  const visible = subscribers.filter((s) => {
    const matchesTerm =
      !term ||
      s.email.toLowerCase().includes(term) ||
      (s.source ?? "").toLowerCase().includes(term);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "confirmed" && s.confirmed && !s.unsubscribed_at) ||
      (statusFilter === "unconfirmed" && !s.confirmed && !s.unsubscribed_at) ||
      (statusFilter === "unsubscribed" && !!s.unsubscribed_at);
    return matchesTerm && matchesStatus;
  });

  const confirmedCount = subscribers.filter((s) => s.confirmed && !s.unsubscribed_at).length;
  const unconfirmedCount = subscribers.filter((s) => !s.confirmed && !s.unsubscribed_at).length;
  const unsubscribedCount = subscribers.filter((s) => !!s.unsubscribed_at).length;

  const unsubscribeMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .update({ unsubscribed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marked unsubscribed");
      qc.invalidateQueries({ queryKey: ["admin", "newsletter_subscribers"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("newsletter_subscribers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin", "newsletter_subscribers"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  function exportCsv() {
    const rows = [
      ["email", "source", "confirmed", "confirmed_at", "unsubscribed_at", "created_at"],
      ...visible.map((s) => [
        s.email,
        s.source ?? "",
        String(s.confirmed),
        s.confirmed_at ?? "",
        s.unsubscribed_at ?? "",
        s.created_at,
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl uppercase">Newsletter</h1>
        <p className="text-sm text-white/50">
          {subscribers.length} subscriber{subscribers.length === 1 ? "" : "s"} · {confirmedCount}{" "}
          confirmed · {unconfirmedCount} unconfirmed · {unsubscribedCount} unsubscribed.
        </p>
        <p className="mt-1 text-xs text-white/35">
          Confirmation emails aren't sent yet — signups are recorded but land as "unconfirmed" until
          that's wired up.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search email or source…"
            aria-label="Search subscribers"
            className="border-white/15 bg-black/40 sm:max-w-xs"
          />
          <div className="flex flex-wrap gap-1.5">
            {(["all", "confirmed", "unconfirmed", "unsubscribed"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                aria-pressed={statusFilter === s}
                className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                  statusFilter === s
                    ? "border-kraft bg-kraft text-ink-dark"
                    : "border-white/15 text-white/55 hover:border-white/40 hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={exportCsv} disabled={visible.length === 0}>
          Export CSV
        </Button>
      </div>

      {isLoading ? (
        <p className="text-white/40">Loading…</p>
      ) : (
        <div className="space-y-2">
          {visible.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded border border-white/10 bg-white/[0.04] p-4"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 truncate font-mono text-sm">
                  {s.confirmed ? (
                    <MailCheck className="h-3.5 w-3.5 shrink-0 text-kraft" aria-label="Confirmed" />
                  ) : (
                    <Mail className="h-3.5 w-3.5 shrink-0 text-white/30" aria-label="Unconfirmed" />
                  )}
                  {s.email}
                  {s.unsubscribed_at && (
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-white/50">
                      Unsubscribed
                    </span>
                  )}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                  {s.source ? `via ${s.source} · ` : ""}
                  joined {new Date(s.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {!s.unsubscribed_at && (
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Mark unsubscribed"
                    disabled={unsubscribeMut.isPending}
                    onClick={() => unsubscribeMut.mutate(s.id)}
                  >
                    <span className="font-mono text-[10px] uppercase">Unsubscribe</span>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  title="Delete permanently"
                  onClick={() =>
                    confirm(`Delete ${s.email} permanently?`) && deleteMut.mutate(s.id)
                  }
                >
                  <Trash2 className="h-3 w-3 text-red-400" />
                </Button>
              </div>
            </div>
          ))}
          {visible.length === 0 && (
            <p className="text-white/40">
              {subscribers.length === 0
                ? "No subscribers yet."
                : "No subscribers match that filter."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
