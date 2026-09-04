import { NextRequest, NextResponse } from "next/server";
import {
  getProvider,
  submitRating,
  validateRatingInput,
} from "@/lib/providers";
import { clientIp, rateLimit } from "@/lib/rateLimit";

// POST /api/providers/:id/rating
// Submits a moderated review for a directory provider. Reviews are stored
// with `approved: false` and only affect the aggregate once an admin approves
// them. Rate-limited per IP to discourage spam.

const RATING_LIMIT = { max: 5, windowMs: 60 * 60 * 1000, baseBackoffMs: 60 * 1000 };

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const limit = await rateLimit(clientIp(request), RATING_LIMIT);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds ?? 60) } }
    );
  }

  const provider = await getProvider(id);
  if (!provider || !provider.approved) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const result = validateRatingInput(raw);
  if (!result.ok) {
    return NextResponse.json({ ok: false, errors: result.errors }, { status: 422 });
  }

  try {
    const rating = await submitRating(id, result.data);
    return NextResponse.json({ ok: true, id: rating.id, pending: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to submit rating:", error);
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 500 });
  }
}