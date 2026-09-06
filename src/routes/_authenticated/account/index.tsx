import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/account/")({
  component: ProfilePage,
});

function ProfilePage() {
  const { t } = useTranslation();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [form, setForm] = useState({ display_name: "", avatar_url: "", bio: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      setEmail(u.user.email ?? "");
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, bio")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (data) {
        const p = data as unknown as {
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
        };
        setForm({
          display_name: p.display_name ?? "",
          avatar_url: p.avatar_url ?? "",
          bio: p.bio ?? "",
        });
      }
      setLoading(false);
    })();
  }, []);

  async function save() {
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({ user_id: userId, ...form }, { onConflict: "user_id" });
      if (error) throw error;
      toast.success(t("profile.saved"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("profile.genericError"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-white/40">{t("common.loading")}</p>;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase">{t("profile.title")}</h1>
        <p className="text-sm text-white/50">
          {t("settings.signedInAs")} <span className="font-mono">{email}</span>
        </p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t("profile.displayName")}</Label>
          <Input
            value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            className="bg-neutral-900 border-neutral-800"
          />
        </div>
        <ImageUpload
          folder="avatars"
          label={t("profile.avatar")}
          value={form.avatar_url}
          onChange={(v) => setForm({ ...form, avatar_url: v })}
        />
        <div className="space-y-2">
          <Label>{t("profile.bio")}</Label>
          <Textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            className="min-h-[120px] bg-neutral-900 border-neutral-800"
          />
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? t("profile.saving") : t("profile.save")}
        </Button>
      </div>
    </div>
  );
}
