import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { MarkdownEditor, UnsavedChangesGuard } from "@/components/admin/MarkdownEditor";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/about")({
  component: AboutAdmin,
});

type About = {
  id: string;
  headline: string | null;
  bio: string | null;
  headshot_url: string | null;
  location: string | null;
  tagline: string | null;
  socials: Record<string, string>;
};

function AboutAdmin() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "about_content"],
    queryFn: async () => {
      const { data, error } = await supabase.from("about_content").select("*").maybeSingle();
      if (error) throw error;
      return data as About | null;
    },
  });

  const [form, setForm] = useState({ headline: "", bio: "", headshot_url: "", location: "", tagline: "", socialsJson: "{}" });
  const initialRef = useRef<string>(JSON.stringify(form));
  const dirty = useMemo(() => initialRef.current !== JSON.stringify(form), [form]);

  useEffect(() => {
    if (data) {
      const next = {
        headline: data.headline ?? "",
        bio: data.bio ?? "",
        headshot_url: data.headshot_url ?? "",
        location: data.location ?? "",
        tagline: data.tagline ?? "",
        socialsJson: JSON.stringify(data.socials ?? {}, null, 2),
      };
      setForm(next);
      initialRef.current = JSON.stringify(next);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      let socials: Record<string, string> = {};
      try { socials = JSON.parse(form.socialsJson || "{}"); }
      catch { throw new Error("Socials must be valid JSON"); }
      const payload = {
        headline: form.headline, bio: form.bio,
        headshot_url: form.headshot_url || null, location: form.location,
        tagline: form.tagline, socials,
      };
      if (data) {
        const { error } = await supabase.from("about_content").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("about_content").insert({ ...payload, singleton: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "about_content"] });
      qc.invalidateQueries({ queryKey: ["public", "about"] });
      initialRef.current = JSON.stringify(form);
      toast.success("Saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (isLoading) return <p className="text-white/40">Loading…</p>;

  return (
    <div
      className="max-w-3xl space-y-6"
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          if (!save.isPending && dirty) save.mutate();
        }
      }}
    >
      <UnsavedChangesGuard dirty={dirty} />
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase">About</h1>
          <p className="text-sm text-white/50">Single record shown across the site.</p>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
          {dirty ? "Unsaved changes" : "Saved"}
        </span>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Headline / Display name</Label>
          <Input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} className="bg-neutral-900 border-neutral-800" />
        </div>
        <ImageUpload folder="about" label="Headshot" value={form.headshot_url} onChange={(v) => setForm({ ...form, headshot_url: v })} />
        <div className="space-y-2">
          <Label>Tagline (shown under the collection)</Label>
          <Textarea rows={3} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className="bg-neutral-900 border-neutral-800" />
        </div>
        <MarkdownEditor
          folder="about"
          label="Bio"
          value={form.bio}
          onChange={(v) => setForm({ ...form, bio: v })}
          rows={10}
        />
        <div className="space-y-2">
          <Label>Location</Label>
          <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="bg-neutral-900 border-neutral-800" />
        </div>
        <div className="space-y-2">
          <Label>Socials (JSON) <span className="text-white/40">e.g. {`{"instagram": "https://…"}`}</span></Label>
          <Textarea rows={5} value={form.socialsJson} onChange={(e) => setForm({ ...form, socialsJson: e.target.value })} className="bg-neutral-900 border-neutral-800 font-mono text-sm" />
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => save.mutate()} disabled={save.isPending || !dirty}>
            {save.isPending ? "Saving…" : "Save (⌘S)"}
          </Button>
        </div>
      </div>
    </div>
  );
}
