import { NextRequest, NextResponse } from "next/server";
import { createLoginCode, getUserByEmail } from "@/lib/auth";
import { sendLoginCode } from "@/lib/mailer";
import { clientIp, rateLimit } from "@/lib/rateLimit";

// POST /api/auth/request-code
// Starts passwordless login for an existing user (admin or member). Always
// returns a generic "sent" response so the endpoint does not reveal which
// emails have accounts. Email delivery is best-effort: if SMTP is not
// configured, the request still returns "sent" but logs the failure.

// Rate limit: 5 requests per 15 minutes per IP, then exponential backoff
// (30s base, doubling per repeated excess). Resets after a day of inactivity.
const REQUEST_CODE_LIMIT = { max: 5, windowMs: 15 * 60 * 1000, baseBackoffMs: 30 * 1000 };

export async function POST(request: NextRequest) {
  const limit = await rateLimit(clientIp(request), REQUEST_CODE_LIMIT);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds ?? 60) } }
    );
  }

  let email: string;
  try {
    const body = await request.json();
    email = String(body?.email ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 422 });
  }

  const user = await getUserByEmail(email);
  if (!user) {
    // Do not reveal that the email has no account.
    return NextResponse.json({ ok: true });
  }

  try {
    const code = await createLoginCode(email);
    try {
      await sendLoginCode(email, code);
    } catch (error) {
      console.error(`Login code email failed for ${email}:`, error);
    }
  } catch (error) {
    console.error("Failed to create login code:", error);
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}