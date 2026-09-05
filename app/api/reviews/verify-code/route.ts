import { NextRequest, NextResponse } from "next/server";
import {
  getExistingReview,
  normalizeReviewerEmail,
  verifyReviewCode,
} from "@/lib/reviews";
import { getProvider } from "@/lib/providers";
import { clientIp, rateLimit } from "@/lib/rateLimit";

// POST /api/reviews/verify-code
// Validates the emailed code and returns a one-use verification token. If the
// reviewer already has a review for this provider, it is returned so the
// client can show the "you already reviewed" edit step instead of the form.

const VERIFY_CODE_LIMIT = { max: 10, windowMs: 15 * 60 * 1000, baseBackoffMs: 30 * 1000 };

export async function POST(request: NextRequest) {
  const limit = await rateLimit(clientIp(request), VERIFY_CODE_LIMIT);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds ?? 60) } }
    );
  }

  let providerId: string;
  let email: string;
  let code: string;
  try {
    const body = await request.json();
    providerId = String(body?.providerId ?? "");
    email = String(body?.email ?? "").trim();
    code = String(body?.code ?? "").trim();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!providerId) {
    return NextResponse.json({ ok: false, error: "invalid_provider" }, { status: 422 });
  }
  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ ok: false, error: "invalid_code" }, { status: 422 });
  }

  const provider = await getProvider(providerId);
  if (!provider || !provider.approved) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const normalized = normalizeReviewerEmail(email);
  const result = await verifyReviewCode(providerId, normalized, code);
  if (!result.ok) {
    const status = result.error === "expired" ? 410 : 401;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }

  const existing = await getExistingReview(providerId, normalized);

  return NextResponse.json({
    ok: true,
    token: result.token,
    email: normalized,
    existing: existing
      ? {
          rating: existing.rating,
          comment: existing.comment ?? "",
        }
      : null,
  });
}