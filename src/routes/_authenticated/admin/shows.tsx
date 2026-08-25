import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { provisionLiveInput } from "@/lib/shows.functions";
import { BROADCAST_KINDS, type BroadcastKind } from "@/lib/broadcast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import { Trash2, Pencil, Plus, KeyRound, Copy, RefreshCw, Eye, EyeOff, Radio } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/shows")({
  component: ShowsAdmin,
});

type Show = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  playback_url: string | null;
  recording_url: string | null;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  published: boolean;
  sort_order: number;
  broadcast_kind: BroadcastKind;
  broadcast_source_url: string | null;
};

type StreamKey = {
  id: string;
  show_id: string;
  ingest_url: string;
  stream_key: string;
  rotated_at: string;
};

const empty = {
  title: "",
  slug: "",
  description: "",
  cover_url: "",
  playback_url: "",
  recording_url: "",
  status: "offline",
  scheduled_at: "",
  published: true,
  sort_order: 0,
  broadcast_kind: "hosted" as BroadcastKind,
  broadcast_source_url: "",
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function copy(value: string, label: string) {
  void navigator.clipboard.writeText(value).then(
    () => toast.success(`${label} copied`),
    () => toast.error("Copy failed"),
  );
}

function ShowsAdmin() {
  const qc = useQueryClient();

  const { data: shows = [], isLoading } = useQuery({
    queryKey: ["admin", "shows"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shows")
        .select("*")
        .order("scheduled_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as Show[];
    },
  });

  const { data: keys = [] } = useQuery({
    queryKey: ["admin", "show_stream_keys"],
    queryFn: async () => {
      const { data, error } = await supabase.from("show_stream_keys").select("*");
      if (error) throw error;
      return data as StreamKey[];
    },
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Show | null>(null);
  const [form, setForm] = useState(empty);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  function startNew() {
    setEditing(null);
    setForm({ ...empty, sort_order: shows.length });
    setOpen(true);
  }

  function startEdit(s: Show) {
    setEditing(s);
    setForm({
      title: s.title,
      slug: s.slug,
      description: s.description ?? "",
      cover_url: s.cover_url ?? "",
      playback_url: s.playback_url ?? "",
      recording_url: s.recording_url ?? "",
      status: s.status,
      scheduled_at: s.scheduled_at ? s.scheduled_at.slice(0, 16) : "",
      published: s.published,
      sort_order: s.sort_order,
      broadcast_kind: s.broadcast_kind,
      broadcast_source_url: s.broadcast_source_url ?? "",
    });
    setOpen(true);
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim() || slugify(form.title),
        description: form.description || null,
        cover_url: form.cover_url || null,
        playback_url: form.playback_url || null,
        recording_url: form.recording_url || null,
        status: form.status,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
        published: form.published,
        sort_order: form.sort_order,
        broadcast_kind: form.broadcast_kind,
        broadcast_source_url:
          form.broadcast_kind === "hosted" ? null : form.broadcast_source_url || null,
      };
      if (editing) {
        const { error } = await supabase.from("shows").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("shows").insert(payload);
        if (error) throw error;
        // Mux credentials are provisioned explicitly (see the panel below),
        // not automatically on create — avoids creating a billable Mux Live
        // Stream for every draft show.
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Show updated" : "Show created");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin", "shows"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shows").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Show deleted");
      qc.invalidateQueries({ queryKey: ["admin", "shows"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  const statusMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const patch: { status: string; started_at?: string; ended_at?: string } = { status };
      if (status === "live") patch.started_at = new Date().toISOString();
      if (status === "ended") patch.ended_at = new Date().toISOString();
      const { error } = await supabase.from("shows").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "shows"] }),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const provisionMut = useMutation({
    mutationFn: async (showId: string) => provisionLiveInput({ data: { showId } }),
    onSuccess: () => {
      toast.success("Mux credentials ready — copy them into OBS");
      qc.invalidateQueries({ queryKey: ["admin", "show_stream_keys"] });
      qc.invalidateQueries({ queryKey: ["admin", "shows"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Provisioning failed"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-tight">Shows</h1>
          <p className="text-sm text-white/50">
            Host directly via Mux, or paste a YouTube/Twitch/Facebook/other watch URL and bridge
            from there.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={startNew}>
              <Plus className="mr-2 h-4 w-4" /> New show
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit show" : "New show"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      title: e.target.value,
                      slug: editing ? f.slug : slugify(e.target.value),
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div>
                <Label>Cover image</Label>
                <ImageUpload
                  value={form.cover_url}
                  onChange={(url) => setForm((f) => ({ ...f, cover_url: url }))}
                />
              </div>
              <div>
                <Label htmlFor="broadcast-kind">Broadcast source</Label>
                <select
                  id="broadcast-kind"
                  value={form.broadcast_kind}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, broadcast_kind: e.target.value as BroadcastKind }))
                  }
                  className="mt-1 w-full border border-white/15 bg-transparent px-3 py-2 text-sm"
                >
                  {BROADCAST_KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </div>
              {form.broadcast_kind === "hosted" ? (
                <div>
                  <Label htmlFor="playback">
                    Playback URL (HLS — filled in automatically once provisioned)
                  </Label>
                  <Input
                    id="playback"
                    readOnly
                    placeholder="Provision Mux credentials below to fill this in"
                    value={form.playback_url}
                  />
                </div>
              ) : (
                <div>
                  <Label htmlFor="broadcast-url">
                    {BROADCAST_KINDS.find((k) => k.value === form.broadcast_kind)?.urlHint}
                  </Label>
                  <Input
                    id="broadcast-url"
                    placeholder="https://…"
                    value={form.broadcast_source_url}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, broadcast_source_url: e.target.value }))
                    }
                  />
                </div>
              )}
              <div>
                <Label htmlFor="recording">Recording URL (past episode)</Label>
                <Input
                  id="recording"
                  placeholder="https://.../episode.m3u8 or .mp4"
                  value={form.recording_url}
                  onChange={(e) => setForm((f) => ({ ...f, recording_url: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="scheduled">Scheduled for</Label>
                  <Input
                    id="scheduled"
                    type="datetime-local"
                    value={form.scheduled_at}
                    onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="mt-1 w-full border border-white/15 bg-transparent px-3 py-2 text-sm"
                  >
                    <option value="offline">Offline</option>
                    <option value="live">Live</option>
                    <option value="ended">Ended (archive)</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="published"
                  checked={form.published}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, published: v }))}
                />
                <Label htmlFor="published">Visible to visitors</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => saveMut.mutate()}
                disabled={!form.title.trim() || saveMut.isPending}
              >
                {saveMut.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-white/40">Loading…</p>
      ) : shows.length === 0 ? (
        <p className="text-white/40">No shows yet — create one to get started.</p>
      ) : (
        <div className="space-y-4">
          {shows.map((s) => {
            const k = keys.find((x) => x.show_id === s.id);
            const show = revealed[s.id] ?? false;
            return (
              <div key={s.id} className="border border-white/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-xl uppercase tracking-tight">{s.title}</h2>
                      <span
                        className={`rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${
                          s.status === "live"
                            ? "bg-red-600/80 text-white"
                            : "bg-white/10 text-white/60"
                        }`}
                      >
                        {s.status}
                      </span>
                      {!s.published && (
                        <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-white/50">
                          Hidden
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
                      /{s.slug}
                      {s.scheduled_at ? ` · ${new Date(s.scheduled_at).toLocaleString()}` : ""}
                      {" · "}
                      {BROADCAST_KINDS.find((k2) => k2.value === s.broadcast_kind)?.label}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {s.status !== "live" ? (
                      <Button
                        size="sm"
                        onClick={() => statusMut.mutate({ id: s.id, status: "live" })}
                      >
                        Go live
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => statusMut.mutate({ id: s.id, status: "ended" })}
                      >
                        End broadcast
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => startEdit(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm(`Delete “${s.title}”?`)) deleteMut.mutate(s.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                  {s.broadcast_kind !== "hosted" ? (
                    <>
                      <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-kraft">
                        <Radio className="h-3 w-3" /> Bridged broadcast
                      </p>
                      <p className="text-sm text-white/60">
                        Broadcasting via{" "}
                        {BROADCAST_KINDS.find((k2) => k2.value === s.broadcast_kind)?.label} —{" "}
                        {s.broadcast_source_url ? (
                          <a
                            href={s.broadcast_source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-white"
                          >
                            {s.broadcast_source_url}
                          </a>
                        ) : (
                          <span className="text-white/40">
                            no URL set yet — edit the show to add one
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-white/40">
                        No OBS credentials needed here — stream to{" "}
                        {BROADCAST_KINDS.find((k2) => k2.value === s.broadcast_kind)?.label} the way
                        you normally would, then flip this show live.
                      </p>
                    </>
                  ) : !k ? (
                    <>
                      <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-kraft">
                        <KeyRound className="h-3 w-3" /> OBS credentials
                      </p>
                      <p className="text-sm text-white/50">Not provisioned yet.</p>
                      <Button
                        size="sm"
                        onClick={() => provisionMut.mutate(s.id)}
                        disabled={provisionMut.isPending}
                      >
                        {provisionMut.isPending ? "Provisioning…" : "Provision via Mux"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-kraft">
                        <KeyRound className="h-3 w-3" /> OBS credentials (Mux)
                      </p>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <Label htmlFor={`ingest-${s.id}`}>Server (RTMP URL)</Label>
                          <div className="flex gap-2">
                            <Input id={`ingest-${s.id}`} readOnly value={k.ingest_url} />
                            <Button
                              size="icon"
                              variant="outline"
                              aria-label="Copy server URL"
                              onClick={() => copy(k.ingest_url, "Server URL")}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`key-${s.id}`}>Stream key</Label>
                          <div className="flex gap-2">
                            <Input
                              id={`key-${s.id}`}
                              readOnly
                              type={show ? "text" : "password"}
                              value={k.stream_key}
                            />
                            <Button
                              size="icon"
                              variant="outline"
                              aria-label={show ? "Hide stream key" : "Show stream key"}
                              onClick={() => setRevealed((r) => ({ ...r, [s.id]: !show }))}
                            >
                              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              aria-label="Copy stream key"
                              onClick={() => copy(k.stream_key, "Stream key")}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              aria-label="Rotate stream key"
                              disabled={provisionMut.isPending}
                              onClick={() => {
                                if (
                                  confirm(
                                    "Rotate credentials? The old key stops working immediately.",
                                  )
                                )
                                  provisionMut.mutate(s.id);
                              }}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-white/40">
                        In OBS: Settings → Stream → Service “Custom”, paste the server URL and
                        stream key. Playback URL is set automatically once provisioned.
                      </p>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
