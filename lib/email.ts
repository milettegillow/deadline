import { Resend } from "resend";
import type { Deadline } from "./types";
import { formatDateLabel } from "./dateUtils";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * The From address for every email. Kept in one place so the display-name
 * persona can be renamed without touching templates.
 */
export const FROM = "Deadline <deadline@thetechbros.io>";

export type EmailType =
  | "reminder"
  | "follow_up"
  | "last_chance"
  | "due_today"
  | "completed";

// ---------------------------------------------------------------------------
// Resend client (instantiated lazily so the build never needs the key)
// ---------------------------------------------------------------------------

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set.");
  }
  return new Resend(apiKey);
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const ACCENT = "#4263f0";

interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/** Mobile-friendly HTML shell with inline styles (required by email clients). */
function layout(opts: {
  preheader: string;
  heading: string;
  body: string; // inner HTML
  banner?: string; // optional coloured banner above the heading
}): string {
  const { preheader, heading, body, banner } = opts;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${heading}</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f6f9;">
    <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f9;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e9ecf2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <tr>
              <td style="padding:20px 28px 0;">
                <span style="display:inline-block;font-size:15px;font-weight:700;color:#1c1c24;">🚩 Deadline</span>
              </td>
            </tr>
            ${
              banner
                ? `<tr><td style="padding:16px 28px 0;"><div style="background:${ACCENT};color:#ffffff;border-radius:12px;padding:14px 16px;font-size:15px;font-weight:600;">${banner}</div></td></tr>`
                : ""
            }
            <tr>
              <td style="padding:20px 28px 8px;">
                <h1 style="margin:0;font-size:20px;line-height:1.3;color:#1c1c24;font-weight:700;">${heading}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 24px;font-size:15px;line-height:1.6;color:#4a4a57;">
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 24px;border-top:1px solid #f0f1f5;">
                <p style="margin:0;font-size:13px;line-height:1.5;color:#9aa0ad;">
                  Just reply <strong>“done”</strong> to this email and I'll stop reminding you.
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-size:12px;color:#b5bac4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            Your friendly Deadline assistant
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 12px;">${text}</p>`;
}

function dueLine(deadline: Deadline): string {
  return `<p style="margin:0 0 12px;color:#6b7280;font-size:14px;">Due ${formatDateLabel(
    deadline.deadlineDate
  )}.</p>`;
}

/** Build the subject + html + text for a given email type and deadline. */
export function renderEmail(type: EmailType, deadline: Deadline): RenderedEmail {
  const title = deadline.title;
  let baseSubject: string;
  let heading: string;
  let body: string;
  let banner: string | undefined;

  switch (type) {
    case "reminder":
      baseSubject = `Remember to ${title} today`;
      heading = `Remember to ${title} today`;
      body =
        paragraph(`Just a friendly nudge — this is on your list for today.`) +
        dueLine(deadline) +
        paragraph(`Reply <strong>“done”</strong> once it's sorted.`);
      break;

    case "follow_up":
      baseSubject = `Did you ${title}?`;
      heading = `Did you ${title}?`;
      body =
        paragraph(`Quick check-in — did you get a chance to ${title}?`) +
        dueLine(deadline) +
        paragraph(
          `If it's handled, reply <strong>“done”</strong>. Otherwise I'll keep gently nudging.`
        );
      break;

    case "last_chance":
      baseSubject = `Last chance: ${title}!`;
      heading = `Last chance: ${title}!`;
      body =
        paragraph(`This is your last nudge — <strong>${title}</strong> still needs doing.`) +
        dueLine(deadline) +
        paragraph(`Reply <strong>“done”</strong> the moment it's finished.`);
      break;

    case "due_today":
      baseSubject = `🚩 ${title} is due TODAY`;
      heading = `${title} is due TODAY`;
      banner = `🚩 Due today`;
      body =
        paragraph(`This is the day — <strong>${title}</strong> is due today.`) +
        paragraph(`Reply <strong>“done”</strong> when it's complete and I'll close it out.`);
      break;

    case "completed":
      baseSubject = `Task completed: ${title} ✅`;
      heading = `Task completed: ${title} ✅`;
      body =
        paragraph(`Nice work — I've marked <strong>${title}</strong> as complete.`) +
        paragraph(`Nothing more to do here. I'll be in touch about the next one.`);
      break;
  }

  // Urgent deadlines get a 🚨 prepended to the subject.
  const subject =
    deadline.urgency === "urgent" ? `🚨 ${baseSubject}` : baseSubject;

  const html = layout({
    preheader: baseSubject,
    heading,
    body,
    banner,
  });

  const text = htmlToText(heading, body);

  return { subject, html, text };
}

/** Very small HTML→text fallback for the plain-text part. */
function htmlToText(heading: string, body: string): string {
  const stripped = body
    .replace(/<\/p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
  return `${heading}\n\n${stripped}\n\nReply "done" to this email and I'll stop reminding you.`;
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

export interface SendDeadlineEmailArgs {
  type: EmailType;
  deadline: Deadline;
  /** Defaults to the deadline's own recipient list. */
  recipients?: string[];
}

/** Render the correct template and send it via Resend. */
export async function sendDeadlineEmail({
  type,
  deadline,
  recipients,
}: SendDeadlineEmailArgs) {
  const to = recipients ?? deadline.recipients;
  if (!to || to.length === 0) {
    throw new Error("No recipients to send to.");
  }

  const { subject, html, text } = renderEmail(type, deadline);
  const resend = getResend();

  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
    text,
  });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}
