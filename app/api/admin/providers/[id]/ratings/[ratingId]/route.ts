import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { approveRating, rejectRating } from "@/lib/providers";

// POST /api/admin/providers/:id/ratings/:ratingId — approve a review.
// DELETE /api/admin/providers/:id/ratings/:ratingId — reject a review.

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; ratingId: string }> }
) {
  if (!(await requirePermission("ratings.moderate"))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id, ratingId } = await params;
  try {
    await approveRating(id, ratingId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "rating_not_found") {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    console.error("Failed to approve rating:", error);
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; ratingId: string }> }
) {
  if (!(await requirePermission("ratings.moderate"))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id, ratingId } = await params;
  try {
    await rejectRating(id, ratingId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to reject rating:", error);
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 500 });
  }
}