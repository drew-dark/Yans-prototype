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
  /** Comma-separated accept string. Defaults to a broad media set. */
  accept?: string;
}

// Signed URL expiry ~10 years (private bucket, single-owner CMS)
const SIGNED_URL_EXPIRY = 60 * 60 * 24 * 365 * 10;

const DEFAULT_ACCEPT =
  "image/*,video/*,audio/*,application/pdf,.svg,.gif,.webp,.avif,.heic,.mp4,.mov,.webm,.mp3,.wav,.m4a,.pdf";

function guessKind(url: string): "image" | "video" | "audio" | "pdf" | "other" {
  const u = url.toLowerCase().split("?")[0];
  if (/\.(png|jpe?g|gif|webp|avif|svg|heic|bmp|tiff?)$/.test(u)) return "image";
  if (/\.(mp4|mov|webm|m4v|ogv)$/.test(u)) return "video";
  if (/\.(mp3|wav|m4a|ogg|flac|aac)$/.test(u)) return "audio";
  if (/\.pdf$/.test(u)) return "pdf";
  return "other";
}

export function ImageUpload({
  value,
  onChange,
  folder = "misc",
  label = "Media",
  accept = DEFAULT_ACCEPT,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("content")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });
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

  const kind = value ? guessKind(value) : "other";

  return (
    <div className="space-y-2">
      <label className="text-xs uppercase tracking-widest text-white/60">{label}</label>
      {value && (
        <div className="relative w-full overflow-hidden rounded border border-white/10 bg-neutral-900">
          {kind === "image" && (
            <img src={value} alt="" className="h-40 w-full object-cover" />
          )}
          {kind === "video" && (
            <video src={value} controls className="h-48 w-full bg-black object-contain" />
          )}
          {kind === "audio" && (
            <div className="p-3">
              <audio src={value} controls className="w-full" />
            </div>
          )}
          {kind === "pdf" && (
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 p-4 text-sm text-white/80 hover:text-white"
            >
              📄 View PDF
            </a>
          )}
          {kind === "other" && (
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="block truncate p-4 text-sm text-white/70 hover:text-white"
            >
              {value}
            </a>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
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
        placeholder="Or paste a URL (image, video, audio, PDF…)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-neutral-900 border-neutral-800 text-xs"
      />
    </div>
  );
}
