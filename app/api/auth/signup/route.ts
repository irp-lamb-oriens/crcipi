import { NextRequest, NextResponse } from "next/server";
import { createLoginCode, createUser, getUserByEmail } from "@/lib/auth";
import { sendLoginCode } from "@/lib/mailer";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { recordEvent } from "@/lib/stats";

// POST /api/auth/signup
// Creates a member account (if it does not exist) and sends a login code.
// Email delivery is best-effort. The account is established even before the
// code is verified so the follow-up /api/auth/verify-code can set a session.

const SIGNUP_LIMIT = { max: 5, windowMs: 15 * 60 * 1000, baseBackoffMs: 30 * 1000 };

export async function POST(request: NextRequest) {
  const limit = await rateLimit(clientIp(request), SIGNUP_LIMIT);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds ?? 60) } }
    );
  }

  let name: string;
  let email: string;
  try {
    const body = await request.json();
    name = String(body?.name ?? "").trim();
    email = String(body?.email ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!name) {
    return NextResponse.json({ ok: false, error: "name_required" }, { status: 422 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 422 });
  }

  const existing = await getUserByEmail(email);
  if (!existing) {
    await createUser({ email, name, role: "member" });
    recordEvent("member_signup");
  }

  try {
    const code = await createLoginCode(email);
    try {
      await sendLoginCode(email, code);
    } catch (error) {
      console.error(`Signup code email failed for ${email}:`, error);
    }
  } catch (error) {
    console.error("Failed to create signup code:", error);
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}