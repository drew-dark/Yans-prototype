import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/admin/ImageUpload";
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

  useEffect(() => {
    if (data) {
      setForm({
        headline: data.headline ?? "",
        bio: data.bio ?? "",
        headshot_url: data.headshot_url ?? "",
        location: data.location ?? "",
        tagline: data.tagline ?? "",
        socialsJson: JSON.stringify(data.socials ?? {}, null, 2),
      });
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "about_content"] }); qc.invalidateQueries({ queryKey: ["public", "about"] }); toast.success("Saved"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (isLoading) return <p className="text-white/40">Loading…</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase">About</h1>
        <p className="text-sm text-white/50">Single record shown across the site.</p>
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
        <div className="space-y-2">
          <Label>Bio</Label>
          <Textarea rows={6} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="bg-neutral-900 border-neutral-800" />
        </div>
        <div className="space-y-2">
          <Label>Location</Label>
          <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="bg-neutral-900 border-neutral-800" />
        </div>
        <div className="space-y-2">
          <Label>Socials (JSON) <span className="text-white/40">e.g. {`{"instagram": "https://…"}`}</span></Label>
          <Textarea rows={5} value={form.socialsJson} onChange={(e) => setForm({ ...form, socialsJson: e.target.value })} className="bg-neutral-900 border-neutral-800 font-mono text-sm" />
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>Save</Button>
      </div>
    </div>
  );
}
