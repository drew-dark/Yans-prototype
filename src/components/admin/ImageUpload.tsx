import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Props {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
}

// Signed URL expiry ~10 years (private bucket, single-owner CMS)
const SIGNED_URL_EXPIRY = 60 * 60 * 24 * 365 * 10;

export function ImageUpload({ value, onChange, folder = "misc", label = "Image" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("content")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;
      const { data, error: sigErr } = await supabase.storage
        .from("content")
        .createSignedUrl(path, SIGNED_URL_EXPIRY);
      if (sigErr) throw sigErr;
      onChange(data.signedUrl);
      toast.success("Uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-xs uppercase tracking-widest text-white/60">{label}</label>
      {value && (
        <div className="relative h-40 w-full overflow-hidden rounded border border-white/10 bg-neutral-900">
          <img src={value} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Uploading…" : value ? "Replace" : "Upload"}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
            Clear
          </Button>
        )}
      </div>
      <Input
        placeholder="Or paste image URL"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-neutral-900 border-neutral-800 text-xs"
      />
    </div>
  );
}
