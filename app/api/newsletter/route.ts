import { NextRequest, NextResponse } from "next/server";
import { subscribeNewsletter } from "@/lib/reviews";
import { clientIp, rateLimit } from "@/lib/rateLimit";

// POST /api/newsletter
// Saves an email address to the platform's newsletter collection. Idempotent
// and keyed by normalized email, so a duplicate entry is a no-op.

const LIMIT = { max: 10, windowMs: 60 * 60 * 1000, baseBackoffMs: 60 * 1000 };

export async function POST(request: NextRequest) {
  const limit = await rateLimit(clientIp(request), LIMIT);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds ?? 60) } }
    );
  }

  let email: string;
  try {
    const body = await request.json();
    email = String(body?.email ?? "").trim();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 422 });
  }

  try {
    await subscribeNewsletter(email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to subscribe newsletter:", error);
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 500 });
  }
}