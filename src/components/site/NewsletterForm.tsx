import { useState } from "react";
import { z } from "zod";
import { subscribeToNewsletter } from "@/lib/newsletter.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const emailSchema = z
  .string()
  .trim()
  .min(3, "Email required")
  .max(320, "Too long")
  .email("That doesn't look like an email");

interface Props {
  source: string;
  variant?: "dark" | "kraft";
  title?: string;
  blurb?: string;
}

export function NewsletterForm({ source, variant = "dark", title, blurb }: Props) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid email");
      return;
    }

    setStatus("loading");
    try {
      const result = await subscribeToNewsletter({
        data: { email: parsed.data.toLowerCase(), source },
      });

      setStatus("success");
      setEmail("");
      if (result.status === "already_subscribed") {
        toast.success(t("newsletterForm.alreadySubscribed"));
      } else if (result.status === "saved_email_failed") {
        toast.success(t("newsletterForm.savedEmailFailed"));
      } else {
        toast.success(t("newsletterForm.success"));
      }
    } catch (err) {
      setStatus("idle");
      toast.error(err instanceof Error ? err.message : t("newsletterForm.genericError"));
    }
  }

  const isKraft = variant === "kraft";

  return (
    <div
      className={
        isKraft
          ? "border-2 border-kraft/40 bg-kraft/5 p-6 md:p-8"
          : "border border-white/10 bg-white/[0.02] p-6 md:p-8"
      }
    >
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.4em] text-white/40">
        {t("newsletterForm.eyebrow")}
      </p>
      <h3 className="font-display text-3xl uppercase leading-tight tracking-tight md:text-4xl">
        {title ?? t("newsletterForm.title")}
      </h3>
      <p className="mt-3 max-w-md text-sm text-white/60">{blurb ?? t("newsletterForm.blurb")}</p>

      {status === "success" ? (
        <p className="mt-6 border-l-2 border-kraft pl-4 font-mono text-xs uppercase tracking-widest text-white/70">
          {t("newsletterForm.thanks")}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={status === "loading"}
            aria-label={t("newsletterForm.emailLabel")}
            className="flex-1 border-white/20 bg-black/40 text-white placeholder:text-white/30"
          />
          <Button
            type="submit"
            disabled={status === "loading"}
            className="bg-kraft font-mono text-[11px] font-bold uppercase tracking-widest text-ink-dark hover:bg-kraft-dark"
          >
            {status === "loading" ? t("newsletterForm.sending") : t("newsletterForm.subscribe")}
          </Button>
        </form>
      )}
      <p className="mt-3 font-mono text-[9px] uppercase tracking-widest text-white/30">
        {t("newsletterForm.footnote")}
      </p>
    </div>
  );
}
