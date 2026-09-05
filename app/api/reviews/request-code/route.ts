import { NextRequest, NextResponse } from "next/server";
import { createReviewCode, normalizeReviewerEmail } from "@/lib/reviews";
import { getProvider } from "@/lib/providers";
import { sendReviewCode } from "@/lib/mailer";
import { clientIp, rateLimit } from "@/lib/rateLimit";

// POST /api/reviews/request-code
// Starts review verification: emails a 6-digit code to the reviewer.
// Always returns a generic "sent" response. Email is best-effort.

const REQUEST_CODE_LIMIT = { max: 5, windowMs: 15 * 60 * 1000, baseBackoffMs: 30 * 1000 };

export async function POST(request: NextRequest) {
  const limit = await rateLimit(clientIp(request), REQUEST_CODE_LIMIT);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds ?? 60) } }
    );
  }

  let providerId: string;
  let email: string;
  try {
    const body = await request.json();
    providerId = String(body?.providerId ?? "");
    email = String(body?.email ?? "").trim();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!providerId) {
    return NextResponse.json({ ok: false, error: "invalid_provider" }, { status: 422 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 422 });
  }

  const provider = await getProvider(providerId);
  if (!provider || !provider.approved) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const normalized = normalizeReviewerEmail(email);

  try {
    const code = await createReviewCode(providerId, normalized);
    try {
      await sendReviewCode(normalized, code);
    } catch (error) {
      console.error(`Review code email failed for ${normalized}:`, error);
    }
  } catch (error) {
    console.error("Failed to create review code:", error);
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}