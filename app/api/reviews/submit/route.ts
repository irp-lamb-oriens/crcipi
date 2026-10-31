import { NextRequest, NextResponse } from "next/server";
import { normalizeReviewerEmail, submitReview } from "@/lib/reviews";
import { recordEvent } from "@/lib/stats";
import { getProvider } from "@/lib/providers";
import { clientIp, rateLimit } from "@/lib/rateLimit";

// POST /api/reviews/submit
// Submits (or edits) a verified review. Requires the one-use token issued by
// /api/reviews/verify-code. Updates the provider aggregate in the same
// transaction.

const SUBMIT_LIMIT = { max: 10, windowMs: 60 * 60 * 1000, baseBackoffMs: 60 * 1000 };

export async function POST(request: NextRequest) {
  const limit = await rateLimit(clientIp(request), SUBMIT_LIMIT);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds ?? 60) } }
    );
  }

  let raw: Record<string, unknown>;
  try {
    raw = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const providerId = String(raw.providerId ?? "");
  const token = String(raw.token ?? "");
  const email = String(raw.email ?? "");
  const name = String(raw.name ?? "").trim();
  const rating = Number(raw.rating);
  const comment = raw.comment ? String(raw.comment) : undefined;

  if (!providerId) {
    return NextResponse.json({ ok: false, error: "invalid_provider" }, { status: 422 });
  }
  if (!name) {
    return NextResponse.json({ ok: false, error: "name_required" }, { status: 422 });
  }
  if (!email) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 422 });
  }

  const provider = await getProvider(providerId);
  if (!provider || !provider.approved) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const result = await submitReview(providerId, {
    name,
    email: normalizeReviewerEmail(email),
    token,
    rating,
    comment,
  });

  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : 401;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }

  // Aggregate values are computed inside the transaction (the server knows the
  // prior rating when editing), so we return those canonical values directly.
  const count = result.count;
  const sum = result.sum;
  if (!result.alreadyReviewed) recordEvent("review_submitted");

  return NextResponse.json({
    ok: true,
    alreadyReviewed: result.alreadyReviewed,
    rating: result.rating,
    aggregate: {
      count,
      sum,
      average: count > 0 ? Math.round((sum / count) * 10) / 10 : null,
    },
  });
}
