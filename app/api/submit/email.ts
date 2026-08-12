// ============================================================
// CR-CIPI Email Service
// Sends a branded confirmation email to the volunteer after a
// successful form submission, and an internal notification to
// the team.
//
// Sending: Gmail SMTP via Nodemailer using the app password
// stored in env vars (never hardcoded).
//
// Note on the From address: Gmail SMTP requires the From header
// to match the authenticated account (or a verified send-as
// alias). We therefore send from the SMTP account and set the
// reply-to to the branded inbox info@crcipi.org so replies land
// in the right place.
// ============================================================

import nodemailer from "nodemailer";
import { site } from "@/content/site";
import type { SubmissionInput } from "@/lib/validators";

const SENDER_EMAIL = process.env.SMTP_USER || "luisarmando@internationalrelocationpartner.com";
const CONTACT_EMAIL = site.contactEmail || "info@crcipi.org";

const MISSING = "N/A";

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function transporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP credentials are not configured (SMTP_USER / SMTP_PASS).");
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// --- HTML builders -------------------------------------------------

// Build the HTML entities from character codes instead of literal entity
// text, so no tooling or encoding layer can corrupt them.
const AMP = String.fromCharCode(38);
const LT = String.fromCharCode(60);
const GT = String.fromCharCode(62);
const QUOT = String.fromCharCode(34);
const APOS = String.fromCharCode(39);

const ESCAPE_MAP: Record<string, string> = {
  [AMP]: AMP + "amp;",
  [LT]: AMP + "lt;",
  [GT]: AMP + "gt;",
  [QUOT]: AMP + "quot;",
  [APOS]: AMP + "#39;",
};

const ESCAPE_RE = new RegExp("[" + AMP + LT + GT + QUOT + APOS + "]", "g");

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(ESCAPE_RE, (ch) => ESCAPE_MAP[ch] ?? ch);
}

function listItems(items: string[]): string {
  if (!items || items.length === 0) return MISSING;
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function emailShell(title: string, bodyHtml: string): string {
  const navy = "#00205b"; // CR-CIPI navy
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:24px 0;">
    <tr>
      <td align="center">
        <!-- Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;">
          <!-- Header band -->
          <tr>
            <td style="background-color:${navy};padding:32px 40px;text-align:center;">
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.02em;">${escapeHtml(site.name)}</div>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:rgba(255,255,255,0.85);margin-top:6px;">${escapeHtml(site.fullName)}</div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#fafafa;border-top:1px solid #e5e5e5;padding:24px 40px;text-align:center;">
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#7e7e7e;line-height:1.6;">
                ${escapeHtml(site.fullName)}<br />
                <a href="${escapeHtml(site.domain)}" style="color:${navy};text-decoration:none;">${escapeHtml(site.domain)}</a>
              </div>
            </td>
          </tr>
        </table>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#bebebe;margin-top:16px;text-align:center;">
          You received this email because you submitted a volunteer application on ${escapeHtml(site.domain)}.
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildVolunteerHtml(data: SubmissionInput): string {
  const expertise = listItems(data.expertise);
  const participation = listItems(data.participation);

  const greeting = data.preferredLanguage === "es" ? "Hola" : "Hello";
  const firstName = escapeHtml(data.firstName);

  const body = `
    <p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#101010;line-height:1.7;margin:0 0 24px;">
      ${greeting} ${firstName},
    </p>
    <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#101010;line-height:1.7;margin:0 0 24px;">
      Thank you for your interest in volunteering with ${escapeHtml(site.name)}. We have received your application and will be in touch shortly.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e5e5;border-radius:8px;overflow:hidden;margin:0 0 24px;">
      <tr>
        <td style="background-color:#f6eceb;padding:12px 16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#a7302f;text-transform:uppercase;letter-spacing:0.05em;">Application summary</td>
      </tr>
      <tr>
        <td style="padding:16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#7e7e7e;width:40%;">Name</td>
              <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#101010;font-weight:600;">${escapeHtml(data.firstName)} ${escapeHtml(data.lastName)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#7e7e7e;width:40%;">Company</td>
              <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#101010;font-weight:600;">${data.company ? escapeHtml(data.company) : MISSING}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#7e7e7e;width:40%;">Profession</td>
              <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#101010;font-weight:600;">${escapeHtml(data.profession)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#7e7e7e;width:40%;">Email</td>
              <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#101010;font-weight:600;">${escapeHtml(data.email)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#7e7e7e;width:40%;">Phone</td>
              <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#101010;font-weight:600;">${data.phone ? escapeHtml(data.phone) : MISSING}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#7e7e7e;width:40%;">LinkedIn</td>
              <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#101010;font-weight:600;">${data.linkedin ? escapeHtml(data.linkedin) : MISSING}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#7e7e7e;width:40%;vertical-align:top;">Expertise</td>
              <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#101010;font-weight:600;"><ul style="margin:0;padding-left:18px;">${expertise}</ul></td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#7e7e7e;width:40%;vertical-align:top;">Participation</td>
              <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#101010;font-weight:600;"><ul style="margin:0;padding-left:18px;">${participation}</ul></td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#7e7e7e;width:40%;vertical-align:top;">Why you want to join</td>
              <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#101010;font-weight:600;">${escapeHtml(data.reason)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#101010;line-height:1.7;margin:0 0 8px;">
      Sincerely,
    </p>
    <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#101010;line-height:1.7;margin:0;">
      The ${escapeHtml(site.name)} Team
    </p>
  `;

  return emailShell("Your application has been received", body);
}

function buildNotificationHtml(data: SubmissionInput): string {
  const body = `
    <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#101010;line-height:1.7;margin:0 0 16px;">
      A new volunteer application has been received.
    </p>
    <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#101010;line-height:1.7;margin:0 0 16px;">
      <strong>${escapeHtml(data.firstName)} ${escapeHtml(data.lastName)}</strong>${data.company ? ` (${escapeHtml(data.company)})` : ""} applied as a <strong>${escapeHtml(data.profession)}</strong>.<br />
      Email: <a href="mailto:${escapeHtml(data.email)}" style="color:#00205b;">${escapeHtml(data.email)}</a>
    </p>
    <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#7e7e7e;line-height:1.6;margin:0;">
      View the full submission in the Firestore <code>submissions</code> collection.
    </p>
  `;

  return emailShell("New volunteer application", body);
}

// --- Public API ----------------------------------------------------

export async function sendVolunteerConfirmation(data: SubmissionInput): Promise<void> {
  const html = buildVolunteerHtml(data);
  const tx = transporter();
  await tx.sendMail({
    from: `"${site.name}" <${SENDER_EMAIL}>`,
    to: data.email,
    replyTo: CONTACT_EMAIL,
    subject:
      data.preferredLanguage === "es"
        ? "Tu solicitud de voluntariado ha sido recibida"
        : "Your volunteer application has been received",
    html,
  });
}

export async function sendInternalNotification(data: SubmissionInput): Promise<void> {
  const html = buildNotificationHtml(data);
  const tx = transporter();
  await tx.sendMail({
    from: `"${site.name}" <${SENDER_EMAIL}>`,
    to: [...site.notifyEmails],
    replyTo: CONTACT_EMAIL,
    subject: `New volunteer application - ${data.firstName} ${data.lastName}`,
    html,
  });
}

