import { useEffect, useRef, useState, type DragEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Markdown } from "@/lib/markdown";
import { toast } from "sonner";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Quote,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Film,
  Eye,
  Pencil,
  Minus,
  Code,
} from "lucide-react";

const SIGNED_URL_EXPIRY = 60 * 60 * 24 * 365 * 10;

interface Props {
  value: string;
  onChange: (v: string) => void;
  folder?: string;
  label?: string;
  rows?: number;
}

export function MarkdownEditor({
  value,
  onChange,
  folder = "body",
  label = "Body",
  rows = 14,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [uploading, setUploading] = useState(false);
  const [pendingKind, setPendingKind] = useState<"image" | "video">("image");
  const [dragOver, setDragOver] = useState(false);

  function surround(before: string, after = before, placeholder = "") {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + before.length + selected.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function linePrefix(prefix: string) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const before = value.slice(0, start);
    const lineStart = before.lastIndexOf("\n") + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + prefix.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function insertAtCursor(snippet: string) {
    const el = ref.current;
    if (!el) {
      onChange(value + "\n" + snippet);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const needsNlBefore = start > 0 && value[start - 1] !== "\n";
    const needsNlAfter = value[end] !== "\n";
    const chunk = (needsNlBefore ? "\n" : "") + snippet + (needsNlAfter ? "\n" : "");
    onChange(value.slice(0, start) + chunk + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + chunk.length;
      el.setSelectionRange(pos, pos);
    });
  }

  async function uploadFile(file: File): Promise<string | null> {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("content").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
      if (error) throw error;
      const { data, error: sigErr } = await supabase.storage
        .from("content")
        .createSignedUrl(path, SIGNED_URL_EXPIRY);
      if (sigErr) throw sigErr;
      return data.signedUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function handleFile(file: File, kindHint?: "image" | "video") {
    const kind =
      kindHint ??
      (file.type.startsWith("video/") ? "video" : "image");
    const url = await uploadFile(file);
    if (!url) return;
    if (kind === "video") insertAtCursor(`@video(${url})`);
    else insertAtCursor(`![${file.name.replace(/\.[^.]+$/, "")}](${url})`);
    toast.success("Inserted");
  }

  function onDrop(e: DragEvent<HTMLTextAreaElement>) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach((f) => handleFile(f));
  }

  function promptLink() {
    const url = window.prompt("Link URL");
    if (!url) return;
    surround("[", `](${url})`, "text");
  }

  const btn =
    "inline-flex h-8 w-8 items-center justify-center rounded border border-white/10 bg-neutral-900 text-white/70 hover:bg-neutral-800 hover:text-white disabled:opacity-40";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-white/40">
          <button
            type="button"
            onClick={() => setMode("write")}
            className={`inline-flex items-center gap-1 rounded px-2 py-1 ${mode === "write" ? "bg-white/10 text-white" : "hover:text-white"}`}
          >
            <Pencil className="h-3 w-3" /> Write
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={`inline-flex items-center gap-1 rounded px-2 py-1 ${mode === "preview" ? "bg-white/10 text-white" : "hover:text-white"}`}
          >
            <Eye className="h-3 w-3" /> Preview
          </button>
        </div>
      </div>

      {mode === "write" && (
        <div className="flex flex-wrap items-center gap-1 rounded-t border border-b-0 border-neutral-800 bg-neutral-950 p-1">
          <button type="button" className={btn} title="Heading 1" onClick={() => linePrefix("# ")}><Heading1 className="h-3.5 w-3.5" /></button>
          <button type="button" className={btn} title="Heading 2" onClick={() => linePrefix("## ")}><Heading2 className="h-3.5 w-3.5" /></button>
          <span className="mx-1 h-4 w-px bg-white/10" />
          <button type="button" className={btn} title="Bold (Cmd+B)" onClick={() => surround("**", "**", "bold")}><Bold className="h-3.5 w-3.5" /></button>
          <button type="button" className={btn} title="Italic (Cmd+I)" onClick={() => surround("*", "*", "italic")}><Italic className="h-3.5 w-3.5" /></button>
          <button type="button" className={btn} title="Inline code" onClick={() => surround("`", "`", "code")}><Code className="h-3.5 w-3.5" /></button>
          <span className="mx-1 h-4 w-px bg-white/10" />
          <button type="button" className={btn} title="Quote" onClick={() => linePrefix("> ")}><Quote className="h-3.5 w-3.5" /></button>
          <button type="button" className={btn} title="Bulleted list" onClick={() => linePrefix("- ")}><List className="h-3.5 w-3.5" /></button>
          <button type="button" className={btn} title="Numbered list" onClick={() => linePrefix("1. ")}><ListOrdered className="h-3.5 w-3.5" /></button>
          <button type="button" className={btn} title="Divider" onClick={() => insertAtCursor("---")}><Minus className="h-3.5 w-3.5" /></button>
          <span className="mx-1 h-4 w-px bg-white/10" />
          <button type="button" className={btn} title="Link" onClick={promptLink}><LinkIcon className="h-3.5 w-3.5" /></button>
          <button
            type="button"
            className={btn}
            title="Insert image"
            disabled={uploading}
            onClick={() => { setPendingKind("image"); fileRef.current?.click(); }}
          >
            <ImageIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={btn}
            title="Insert video"
            disabled={uploading}
            onClick={() => { setPendingKind("video"); fileRef.current?.click(); }}
          >
            <Film className="h-3.5 w-3.5" />
          </button>
          {uploading && <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-white/50">Uploading…</span>}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        hidden
        accept={pendingKind === "video" ? "video/*" : "image/*"}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f, pendingKind);
          if (fileRef.current) fileRef.current.value = "";
        }}
      />

      {mode === "write" ? (
        <textarea
          ref={ref}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
              e.preventDefault(); surround("**", "**", "bold");
            } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
              e.preventDefault(); surround("*", "*", "italic");
            } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
              e.preventDefault(); promptLink();
            }
          }}
          className={`min-h-[240px] w-full resize-y rounded-b border border-neutral-800 bg-neutral-900 p-3 font-mono text-sm text-white outline-none focus:border-white/40 ${dragOver ? "border-white/60 bg-neutral-800/70" : ""}`}
          placeholder="Write here. Drag & drop images or video, or use the toolbar. Markdown supported."
        />
      ) : (
        <div className="min-h-[240px] rounded border border-neutral-800 bg-neutral-950 p-5">
          {value.trim() ? (
            <Markdown text={value} className="text-white/85" />
          ) : (
            <p className="text-sm text-white/40">Nothing to preview yet.</p>
          )}
        </div>
      )}

      <p className="font-mono text-[10px] uppercase tracking-widest text-white/30">
        Markdown · **bold** *italic* # heading &gt; quote · drag files into the editor
      </p>
    </div>
  );
}

export function UnsavedChangesGuard({ dirty }: { dirty: boolean }) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  return null;
}
