import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getProvider, listRatings } from "@/lib/providers";

// GET /api/member/providers/:id/reviews
// Returns the full review list (including reviewer emails, hidden from the
// public) for a provider the signed-in member owns.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const provider = await getProvider(id);
  if (!provider) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (provider.ownerId !== user.userId && user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const ratings = await listRatings(id, { approvedOnly: true });
  return NextResponse.json({
    ok: true,
    reviews: ratings.map((rating) => ({
      id: rating.id,
      rating: rating.rating,
      reviewerName: rating.reviewerName,
      reviewerEmail: rating.reviewerEmail ?? null,
      comment: rating.comment ?? "",
      createdAt: rating.createdAt,
    })),
  });
}