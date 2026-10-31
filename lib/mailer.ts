import nodemailer from "nodemailer";
import { site } from "@/content/site";

const SENDER_EMAIL = process.env.SMTP_USER || "luisarmando@internationalrelocationpartner.com";

function transporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP credentials are not configured (SMTP_USER / SMTP_PASS).");
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export async function sendLoginCode(email: string, code: string): Promise<void> {
  const tx = transporter();
  await tx.sendMail({
    from: `"${site.name}" <${SENDER_EMAIL}>`,
    to: email,
    subject: `Your ${site.name} access code`,
    text: `Your ${site.name} access code is ${code}. It expires in 10 minutes.`,
    html: `<p>Your ${site.name} access code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:0.2em;">${code}</p><p>It expires in 10 minutes.</p>`,
  });
}

export async function sendReviewCode(email: string, code: string): Promise<void> {
  const tx = transporter();
  await tx.sendMail({
    from: `"${site.name}" <${SENDER_EMAIL}>`,
    to: email,
    subject: `Verify your review on ${site.name}`,
    text: `Your verification code is ${code}. It expires in 10 minutes.`,
    html: `<p>Your verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:0.2em;">${code}</p><p>It expires in 10 minutes.</p>`,
  });
}

// Entities are built from char codes so no tooling layer can decode them on
// write (see dreams.md, 2026-08-12).
const ESCAPES: Record<string, string> = {
  "&": `${String.fromCharCode(38)}amp;`,
  "<": `${String.fromCharCode(38)}lt;`,
  ">": `${String.fromCharCode(38)}gt;`,
  '"': `${String.fromCharCode(38)}quot;`,
  "'": `${String.fromCharCode(38)}#39;`,
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);
}

export interface NoticeEmail {
  to: string;
  subject: string;
  heading: string;
  lines: string[];
  cta?: { label: string; url: string };
  replyTo?: string;
}

// Generic branded platform notification (verification decisions, job
// applications, article reviews). All dynamic text is HTML-escaped.
export async function sendNotice(notice: NoticeEmail): Promise<void> {
  const tx = transporter();
  const ctaUrl = notice.cta
    ? notice.cta.url.startsWith("http")
      ? notice.cta.url
      : `${site.domain}${notice.cta.url}`
    : null;
  const paragraphs = notice.lines
    .map((line) => `<p style="margin:0 0 12px;line-height:1.6;">${escapeHtml(line)}</p>`)
    .join("");
  const button =
    notice.cta && ctaUrl
      ? `<p style="margin:20px 0 0;"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#a7302f;color:#ffffff;padding:10px 22px;border-radius:60px;text-decoration:none;">${escapeHtml(notice.cta.label)}</a></p>`
      : "";

  await tx.sendMail({
    from: `"${site.name}" <${SENDER_EMAIL}>`,
    to: notice.to,
    replyTo: notice.replyTo ?? site.contactEmail,
    subject: notice.subject,
    text: [notice.heading, "", ...notice.lines, ctaUrl ? `\n${notice.cta?.label}: ${ctaUrl}` : ""]
      .join("\n")
      .trim(),
    html: `<div style="font-family:Helvetica,Arial,sans-serif;color:#101010;max-width:560px;"><div style="background:#00205b;color:#ffffff;padding:16px 20px;font-weight:700;">${escapeHtml(site.name)}</div><div style="padding:20px;border:1px solid #e5e5e5;border-top:none;"><h1 style="font-size:18px;margin:0 0 14px;">${escapeHtml(notice.heading)}</h1>${paragraphs}${button}</div></div>`,
  });
}

// Fire-and-forget wrapper: notifications must never fail the request.
export function notify(notice: NoticeEmail): void {
  void sendNotice(notice).catch((error) =>
    console.error(`notice email failed (${notice.subject}) to ${notice.to}:`, error)
  );
}
