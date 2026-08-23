import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  isAdminEmail,
  recordFailedAttempt,
  setSessionCookie,
  verifyLoginCode,
} from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rateLimit";

// POST /api/auth/verify-code
// Validates the emailed code and establishes a session cookie.

// Rate limit: 10 attempts per 15 minutes per IP, then exponential backoff
// (30s base, doubling per repeated excess). Resets after a day of inactivity.
const VERIFY_CODE_LIMIT = { max: 10, windowMs: 15 * 60 * 1000, baseBackoffMs: 30 * 1000 };

export async function POST(request: NextRequest) {
  const limit = await rateLimit(clientIp(request), VERIFY_CODE_LIMIT);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds ?? 60) } }
    );
  }

  let email: string;
  let code: string;
  try {
    const body = await request.json();
    email = String(body?.email ?? "").trim().toLowerCase();
    code = String(body?.code ?? "").trim();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 422 });
  }

  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ ok: false, error: "invalid_code" }, { status: 422 });
  }

  if (!(await isAdminEmail(email))) {
    return NextResponse.json({ ok: false, error: "invalid_code" }, { status: 401 });
  }

  const result = await verifyLoginCode(email, code);
  if (!result.ok) {
    if (result.error !== "too_many_attempts") {
      await recordFailedAttempt(email, code);
    }
    const status =
      result.error === "too_many_attempts"
        ? 429
        : result.error === "expired"
          ? 410
          : 401;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }

  const token = await createSession(email);
  await setSessionCookie(token);

  return NextResponse.json({ ok: true });
}