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

  async function uploadBlob(blob: Blob, ext: string, contentType?: string): Promise<string | null> {
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("content").upload(path, blob, {
      cacheControl: "3600",
      upsert: false,
      contentType: contentType || blob.type || undefined,
    });
    if (error) throw error;
    const { data, error: sigErr } = await supabase.storage
      .from("content")
      .createSignedUrl(path, SIGNED_URL_EXPIRY);
    if (sigErr) throw sigErr;
    return data.signedUrl;
  }

  /** Generate a JPEG poster from a video file by seeking to ~1s and rasterising. */
  async function generateVideoPoster(file: File): Promise<Blob | null> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";
      video.src = url;
      let done = false;
      const cleanup = () => { URL.revokeObjectURL(url); };
      const bail = () => { if (done) return; done = true; cleanup(); resolve(null); };
      const timeout = window.setTimeout(bail, 8000);
      video.addEventListener("loadedmetadata", () => {
        const target = Math.min(1, Math.max(0, (video.duration || 2) * 0.1));
        try { video.currentTime = target; } catch { bail(); }
      });
      video.addEventListener("seeked", () => {
        if (done) return;
        try {
          const w = video.videoWidth;
          const h = video.videoHeight;
          if (!w || !h) return bail();
          const scale = Math.min(1, 1280 / Math.max(w, h));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(w * scale);
          canvas.height = Math.round(h * scale);
          const ctx = canvas.getContext("2d");
          if (!ctx) return bail();
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            done = true;
            window.clearTimeout(timeout);
            cleanup();
            resolve(blob);
          }, "image/jpeg", 0.82);
        } catch {
          bail();
        }
      });
      video.addEventListener("error", bail);
    });
  }

  async function handleFile(file: File, kindHint?: "image" | "video") {
    const kind =
      kindHint ??
      (file.type.startsWith("video/") ? "video" : "image");
    setUploading(true);
    try {
      if (kind === "video") {
        const [videoUrl, posterBlob] = await Promise.all([
          uploadBlob(file, file.name.split(".").pop() || "mp4", file.type),
          generateVideoPoster(file),
        ]);
        if (!videoUrl) return;
        let posterUrl: string | null = null;
        if (posterBlob) {
          try { posterUrl = await uploadBlob(posterBlob, "jpg", "image/jpeg"); }
          catch { posterUrl = null; }
        }
        insertAtCursor(posterUrl ? `@video(${videoUrl}, poster=${posterUrl})` : `@video(${videoUrl})`);
        toast.success(posterUrl ? "Video inserted with poster" : "Video inserted");
      } else {
        const url = await uploadBlob(file, file.name.split(".").pop() || "bin", file.type);
        if (!url) return;
        insertAtCursor(`![${file.name.replace(/\.[^.]+$/, "")}](${url})`);
        toast.success("Image inserted");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
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
    "inline-flex h-8 w-8 items-center justify-center rounded border border-white/10 bg-neutral-900 text-white/70 hover:bg-neutral-800 hover:text-white disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-1 focus-visible:ring-offset-neutral-950";

  type ToolbarItem = {
    key: string;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
  };

  const toolbarItems: (ToolbarItem | { separator: true; key: string })[] = [
    { key: "h1", label: "Heading 1", icon: <Heading1 className="h-3.5 w-3.5" />, onClick: () => linePrefix("# ") },
    { key: "h2", label: "Heading 2", icon: <Heading2 className="h-3.5 w-3.5" />, onClick: () => linePrefix("## ") },
    { separator: true, key: "s1" },
    { key: "bold", label: "Bold (Cmd+B)", icon: <Bold className="h-3.5 w-3.5" />, onClick: () => surround("**", "**", "bold") },
    { key: "italic", label: "Italic (Cmd+I)", icon: <Italic className="h-3.5 w-3.5" />, onClick: () => surround("*", "*", "italic") },
    { key: "code", label: "Inline code", icon: <Code className="h-3.5 w-3.5" />, onClick: () => surround("`", "`", "code") },
    { separator: true, key: "s2" },
    { key: "quote", label: "Quote", icon: <Quote className="h-3.5 w-3.5" />, onClick: () => linePrefix("> ") },
    { key: "ul", label: "Bulleted list", icon: <List className="h-3.5 w-3.5" />, onClick: () => linePrefix("- ") },
    { key: "ol", label: "Numbered list", icon: <ListOrdered className="h-3.5 w-3.5" />, onClick: () => linePrefix("1. ") },
    { key: "hr", label: "Divider", icon: <Minus className="h-3.5 w-3.5" />, onClick: () => insertAtCursor("---") },
    { separator: true, key: "s3" },
    { key: "link", label: "Link (Cmd+K)", icon: <LinkIcon className="h-3.5 w-3.5" />, onClick: promptLink },
    { key: "image", label: "Insert image", icon: <ImageIcon className="h-3.5 w-3.5" />, disabled: uploading, onClick: () => { setPendingKind("image"); fileRef.current?.click(); } },
    { key: "video", label: "Insert video", icon: <Film className="h-3.5 w-3.5" />, disabled: uploading, onClick: () => { setPendingKind("video"); fileRef.current?.click(); } },
  ];

  const focusableKeys = toolbarItems
    .filter((it): it is ToolbarItem => !("separator" in it) && !it.disabled)
    .map((it) => it.key);
  const [activeKey, setActiveKey] = useState<string>(focusableKeys[0] ?? "");
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Keep active key valid if items become disabled (e.g. during upload)
  useEffect(() => {
    if (!focusableKeys.includes(activeKey) && focusableKeys[0]) {
      setActiveKey(focusableKeys[0]);
    }
  }, [focusableKeys, activeKey]);

  function focusToolbarBtn(key: string) {
    const el = toolbarRef.current?.querySelector<HTMLButtonElement>(
      `[data-tb-key="${key}"]`,
    );
    el?.focus();
  }

  function onToolbarKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const keys = focusableKeys;
    if (!keys.length) return;
    const idx = Math.max(0, keys.indexOf(activeKey));
    let next = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (idx + 1) % keys.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (idx - 1 + keys.length) % keys.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = keys.length - 1;
    else return;
    e.preventDefault();
    setActiveKey(keys[next]);
    focusToolbarBtn(keys[next]);
  }

  const tabBtn = (active: boolean) =>
    `inline-flex items-center gap-1 rounded px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-1 focus-visible:ring-offset-neutral-950 ${active ? "bg-white/10 text-white" : "hover:text-white"}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <div
          role="tablist"
          aria-label="Editor mode"
          className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-white/40"
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              e.preventDefault();
              setMode(mode === "write" ? "preview" : "write");
            }
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "write"}
            tabIndex={mode === "write" ? 0 : -1}
            onClick={() => setMode("write")}
            className={tabBtn(mode === "write")}
          >
            <Pencil className="h-3 w-3" aria-hidden="true" /> Write
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "preview"}
            tabIndex={mode === "preview" ? 0 : -1}
            onClick={() => setMode("preview")}
            className={tabBtn(mode === "preview")}
          >
            <Eye className="h-3 w-3" aria-hidden="true" /> Preview
          </button>
        </div>
      </div>

      {mode === "write" && (
        <div
          ref={toolbarRef}
          role="toolbar"
          aria-label="Formatting"
          aria-orientation="horizontal"
          onKeyDown={onToolbarKeyDown}
          className="flex flex-wrap items-center gap-1 rounded-t border border-b-0 border-neutral-800 bg-neutral-950 p-1"
        >
          {toolbarItems.map((it) => {
            if ("separator" in it) {
              return <span key={it.key} role="separator" aria-orientation="vertical" className="mx-1 h-4 w-px bg-white/10" />;
            }
            const isActive = it.key === activeKey;
            return (
              <button
                key={it.key}
                type="button"
                data-tb-key={it.key}
                className={btn}
                aria-label={it.label}
                title={it.label}
                disabled={it.disabled}
                tabIndex={isActive ? 0 : -1}
                onFocus={() => setActiveKey(it.key)}
                onClick={it.onClick}
              >
                {it.icon}
              </button>
            );
          })}
          {uploading && (
            <span aria-live="polite" className="ml-2 font-mono text-[10px] uppercase tracking-widest text-white/50">
              Uploading…
            </span>
          )}
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
