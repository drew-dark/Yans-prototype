// Server-only. Never import this from a route file or *.functions.ts at the
// top level — those ship to the client bundle. Load it inside a server
// function handler instead: const { sendEmail } = await import("@/lib/resend.server");

const RESEND_API_URL = "https://api.resend.com/emails";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/**
 * Sends one email via Resend. Requires RESEND_API_KEY (and optionally
 * RESEND_FROM_EMAIL — defaults to Resend's sandbox sender, which only
 * delivers to your own verified Resend account address; add your own
 * verified domain's address as RESEND_FROM_EMAIL for real delivery).
 * Throws on failure — callers decide how to handle that (e.g. still treat
 * the subscription as recorded even if the confirmation email fails to send).
 */
export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY environment variable.");
  }
  const from = process.env.RESEND_FROM_EMAIL || "The Last Mukwasu <onboarding@resend.dev>";

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, ...(text ? { text } : {}) }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      detail = JSON.stringify(await res.json());
    } catch {
      detail = await res.text();
    }
    throw new Error(`Resend send failed (${res.status}): ${detail}`);
  }
}
