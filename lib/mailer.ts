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