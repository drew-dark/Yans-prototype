import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sendNewsletterIssue } from "@/lib/newsletter.functions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/admin/ImageUpload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Mail, MailCheck, Send, Eye, EyeOff, Save, FileText } from "lucide-react";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Default mode: blank-line-separated paragraphs, escaped so a stray "<" or
// "&" in the draft can't break the markup. The "raw HTML" switch below skips
// this for anyone who wants to write the email body directly — inserting an
// image (see handleInsertImage) also switches into this mode, since an
// <img> tag would otherwise get escaped into visible text.
function plainTextToParagraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

type NewsletterIssue = {
  id: string;
  subject: string;
  body_html: string;
  status: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  sent_at: string | null;
  created_at: string;
};

type NewsletterTemplate = {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  created_at: string;
};

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

  const { data: issues = [] } = useQuery({
    queryKey: ["admin", "newsletter_issues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_issues")
        .select(
          "id, subject, body_html, status, recipient_count, sent_count, failed_count, sent_at, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as NewsletterIssue[];
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["admin", "newsletter_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_templates")
        .select("id, name, subject, body_html, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as NewsletterTemplate[];
    },
  });

  const [showCompose, setShowCompose] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [rawHtml, setRawHtml] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [segment, setSegment] = useState("__all__");
  const bodyRef = useRef<HTMLTextAreaElement>(null);

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

  const sources = useMemo(
    () => Array.from(new Set(subscribers.map((s) => s.source).filter((s): s is string => !!s))),
    [subscribers],
  );
  const segmentCount =
    segment === "__all__"
      ? confirmedCount
      : subscribers.filter((s) => s.confirmed && !s.unsubscribed_at && s.source === segment).length;

  function resetComposer() {
    setDraftId(null);
    setSubject("");
    setBody("");
    setRawHtml(false);
    setSegment("__all__");
    setShowPreview(false);
  }

  function loadIntoComposer(issue: { id?: string; subject: string; body_html: string }) {
    setDraftId(issue.id ?? null);
    setSubject(issue.subject);
    setBody(issue.body_html);
    setRawHtml(true); // saved HTML (from a draft or template) is always shown raw, not re-escaped
    setShowCompose(true);
  }

  function handleInsertImage(url: string) {
    if (!url) return;
    const snippet = `<p><img src="${url}" alt="" style="max-width:100%;height:auto;display:block;margin:0 0 16px" /></p>`;
    if (!rawHtml && body.trim()) {
      // Switching modes mid-draft would silently escape everything typed
      // so far the next time it's re-rendered — convert what's there once,
      // at the moment of the switch, instead of losing it later.
      setBody(plainTextToParagraphs(body) + "\n" + snippet);
    } else {
      const el = bodyRef.current;
      if (el && document.activeElement === el) {
        const pos = el.selectionStart ?? body.length;
        setBody(body.slice(0, pos) + snippet + body.slice(pos));
      } else {
        setBody((b) => (b ? `${b}\n${snippet}` : snippet));
      }
    }
    setRawHtml(true);
    toast.success("Image inserted");
  }

  const sendMut = useMutation({
    mutationFn: async () => {
      const bodyHtml = rawHtml ? body.trim() : plainTextToParagraphs(body);
      return sendNewsletterIssue({
        data: {
          subject: subject.trim(),
          bodyHtml,
          sourceFilter: segment === "__all__" ? undefined : segment,
        },
      });
    },
    onSuccess: async (result) => {
      if (result.failedCount > 0) {
        toast.error(
          `Sent to ${result.sentCount} of ${result.recipientCount} — ${result.failedCount} failed. Check the issue history below.`,
        );
      } else {
        toast.success(
          `Sent to ${result.sentCount} confirmed subscriber${result.sentCount === 1 ? "" : "s"}`,
        );
      }
      // A sent issue supersedes the draft row it was composed from — remove
      // the draft so it doesn't linger alongside the now-sent copy.
      if (draftId) {
        await supabase.from("newsletter_issues").delete().eq("id", draftId);
      }
      resetComposer();
      setShowCompose(false);
      qc.invalidateQueries({ queryKey: ["admin", "newsletter_issues"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Send failed"),
  });

  function handleSend() {
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and body are both required");
      return;
    }
    if (segmentCount === 0) {
      toast.error("No confirmed subscribers in that segment");
      return;
    }
    if (
      confirm(
        `Send "${subject.trim()}" to ${segmentCount} confirmed subscriber${segmentCount === 1 ? "" : "s"}${
          segment === "__all__" ? "" : ` (source: ${segment})`
        }? This can't be undone.`,
      )
    ) {
      sendMut.mutate();
    }
  }

  const saveDraftMut = useMutation({
    mutationFn: async () => {
      const bodyHtml = rawHtml ? body.trim() : plainTextToParagraphs(body);
      const { data, error } = await supabase
        .from("newsletter_issues")
        .upsert({
          id: draftId ?? undefined,
          subject: subject.trim() || "(untitled draft)",
          body_html: bodyHtml || "<p></p>",
          status: "draft",
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      setDraftId(id);
      toast.success("Draft saved");
      qc.invalidateQueries({ queryKey: ["admin", "newsletter_issues"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to save draft"),
  });

  const deleteIssueMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("newsletter_issues").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin", "newsletter_issues"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const saveTemplateMut = useMutation({
    mutationFn: async () => {
      const name = prompt("Template name?", subject.trim() || "Untitled template");
      if (!name) return null;
      const bodyHtml = rawHtml ? body.trim() : plainTextToParagraphs(body);
      const { error } = await supabase
        .from("newsletter_templates")
        .insert({ name, subject: subject.trim(), body_html: bodyHtml });
      if (error) throw error;
      return name;
    },
    onSuccess: (name) => {
      if (!name) return;
      toast.success(`Saved template "${name}"`);
      qc.invalidateQueries({ queryKey: ["admin", "newsletter_templates"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to save template"),
  });

  const deleteTemplateMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("newsletter_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template deleted");
      qc.invalidateQueries({ queryKey: ["admin", "newsletter_templates"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

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

  const previewHtml = rawHtml ? body : plainTextToParagraphs(body);
  const drafts = issues.filter((i) => i.status === "draft");
  const sentIssues = issues.filter((i) => i.status !== "draft");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase">Newsletter</h1>
          <p className="text-sm text-white/50">
            {subscribers.length} subscriber{subscribers.length === 1 ? "" : "s"} · {confirmedCount}{" "}
            confirmed · {unconfirmedCount} unconfirmed · {unsubscribedCount} unsubscribed.
          </p>
          <p className="mt-1 text-xs text-white/35">
            Confirmation emails send automatically via Resend on signup. Set RESEND_API_KEY (and
            optionally RESEND_FROM_EMAIL for your own verified sending domain) as an environment
            variable — never commit it.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            if (showCompose) resetComposer();
            setShowCompose((v) => !v);
          }}
          className="bg-kraft font-mono text-[11px] font-bold uppercase tracking-widest text-ink-dark hover:bg-kraft-dark"
        >
          <Send className="mr-1.5 h-3.5 w-3.5" />
          {showCompose ? "Cancel" : "Compose issue"}
        </Button>
      </div>

      {showCompose && (
        <div className="space-y-4 rounded border border-kraft/40 bg-kraft/5 p-5">
          {templates.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                Start from template:
              </span>
              {templates.map((tpl) => (
                <span key={tpl.id} className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => loadIntoComposer(tpl)}
                    className="rounded-full border border-white/15 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-white/60 hover:border-kraft hover:text-white"
                  >
                    {tpl.name}
                  </button>
                  <button
                    type="button"
                    title="Delete template"
                    onClick={() => confirm(`Delete template "${tpl.name}"?`) && deleteTemplateMut.mutate(tpl.id)}
                    className="text-white/25 hover:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject line"
            aria-label="Subject"
            className="border-white/15 bg-black/40"
          />

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1">
              <ImageUpload
                value=""
                onChange={handleInsertImage}
                folder="newsletter"
                label="Insert image into body"
                accept="image/*"
              />
            </div>
          </div>

          {showPreview ? (
            <div className="rounded border border-white/15 bg-white p-4">
              <div
                className="mx-auto max-w-[480px]"
                style={{ fontFamily: "Georgia, serif", color: "#1a1a1a" }}
                dangerouslySetInnerHTML={{
                  __html: `<h1 style="font-size:22px;margin:0 0 12px">${escapeHtml(subject) || "(subject)"}</h1><div style="font-size:15px;line-height:1.6">${previewHtml}</div>`,
                }}
              />
            </div>
          ) : (
            <Textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={
                rawHtml
                  ? "<p>Raw HTML body…</p>"
                  : "Write the issue here. Leave a blank line between paragraphs."
              }
              rows={10}
              aria-label="Body"
              className="border-white/15 bg-black/40 font-mono text-sm"
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-white/50">
                <Switch checked={rawHtml} onCheckedChange={setRawHtml} />
                Raw HTML
              </label>
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-white/50 hover:text-white"
              >
                {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showPreview ? "Back to editing" : "Preview"}
              </button>
              {sources.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                    Send to:
                  </span>
                  <Select value={segment} onValueChange={setSegment}>
                    <SelectTrigger className="h-7 w-auto gap-1.5 border-white/15 bg-black/40 font-mono text-[10px] uppercase tracking-widest">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All confirmed ({confirmedCount})</SelectItem>
                      {sources.map((src) => (
                        <SelectItem key={src} value={src}>
                          {src}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={saveTemplateMut.isPending || (!subject.trim() && !body.trim())}
                onClick={() => saveTemplateMut.mutate()}
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Save as template
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={saveDraftMut.isPending}
                onClick={() => saveDraftMut.mutate()}
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {saveDraftMut.isPending ? "Saving…" : "Save draft"}
              </Button>
              <Button
                size="sm"
                disabled={sendMut.isPending}
                onClick={handleSend}
                className="bg-kraft font-mono text-[11px] font-bold uppercase tracking-widest text-ink-dark hover:bg-kraft-dark"
              >
                {sendMut.isPending ? "Sending…" : `Send to ${segmentCount}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {drafts.length > 0 && (
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
            Drafts
          </p>
          {drafts.map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded border border-white/10 bg-white/[0.03] p-3"
            >
              <button
                type="button"
                onClick={() => loadIntoComposer(d)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate font-mono text-sm">{d.subject}</p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                  Last saved {new Date(d.created_at).toLocaleString()}
                </p>
              </button>
              <div className="flex items-center gap-1">
                <span className="shrink-0 rounded bg-white/10 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-white/50">
                  Draft
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  title="Delete draft"
                  onClick={() => confirm("Delete this draft?") && deleteIssueMut.mutate(d.id)}
                >
                  <Trash2 className="h-3 w-3 text-red-400" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sentIssues.length > 0 && (
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
            Recent issues
          </p>
          {sentIssues.map((iss) => (
            <div
              key={iss.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded border border-white/10 bg-white/[0.03] p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-sm">{iss.subject}</p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                  {new Date(iss.created_at).toLocaleString()}
                </p>
              </div>
              <span
                className={`shrink-0 rounded px-2 py-1 font-mono text-[10px] uppercase tracking-widest ${
                  iss.status === "sent"
                    ? "bg-kraft/20 text-kraft"
                    : iss.status === "sending"
                      ? "bg-white/10 text-white/60"
                      : "bg-red-500/20 text-red-300"
                }`}
              >
                {iss.status === "sending"
                  ? "Sending…"
                  : `${iss.status.replace("_", " ")} · ${iss.sent_count}/${iss.recipient_count}`}
              </span>
            </div>
          ))}
        </div>
      )}

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
