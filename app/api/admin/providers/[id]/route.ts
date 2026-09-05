import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import {
  deleteProvider,
  getProvider,
  listRatings,
  updateProvider,
  validateProviderInput,
} from "@/lib/providers";

// GET /api/admin/providers/:id — full provider + all reviews (incl. pending).
// PATCH /api/admin/providers/:id — update provider fields (partial).
// DELETE /api/admin/providers/:id — delete a provider.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requirePermission("providers.manage"))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const provider = await getProvider(id);
  if (!provider) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  const ratings = await listRatings(id);
  return NextResponse.json({ ok: true, provider: { ...provider, ratings } });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requirePermission("providers.manage"))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  if (!(await getProvider(id))) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  // Merge a full validated payload for editable fields, plus scalar approved
  // and ownerId toggles that can be patched independently.
  const validation = validateProviderInput(body);
  const approved =
    body.approved === true || body.approved === false ? body.approved : undefined;
  const ownerId =
    typeof body.ownerId === "string" ? body.ownerId : body.ownerId === null ? null : undefined;

  if (validation.ok) {
    try {
      await updateProvider(id, { ...validation.data, approved });
      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error("Failed to update provider:", error);
      return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 500 });
    }
  }

  // Allow a toggle-only patch when no editable fields are present.
  if (
    (approved !== undefined || ownerId !== undefined) &&
    Object.keys(body).every((key) => key === "approved" || key === "ownerId")
  ) {
    try {
      await updateProvider(id, { approved, ownerId });
      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error("Failed to update provider:", error);
      return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: false, errors: validation.errors }, { status: 422 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requirePermission("providers.manage"))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    await deleteProvider(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete provider:", error);
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 500 });
  }
}