import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  deleteProvider,
  getProvider,
  updateProvider,
  validateProviderInput,
} from "@/lib/providers";

// GET   /api/member/providers/:id — fetch own provider.
// PATCH /api/member/providers/:id — edit own provider fields.
// DELETE /api/member/providers/:id — delete own provider.
//
// Every handler resolves the provider and enforces `provider.ownerId ===
// session.userId`. Members cannot edit another business, self-feature, or
// self-approve.

async function ownProvider(id: string, userId: string) {
  const provider = await getProvider(id);
  if (!provider) return { provider: null, forbidden: false as const };
  if (provider.ownerId !== userId) return { provider: null, forbidden: true as const };
  return { provider, forbidden: false as const };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const { provider, forbidden } = await ownProvider(id, user.userId);
  if (forbidden) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  if (!provider) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, provider });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const { provider, forbidden } = await ownProvider(id, user.userId);
  if (forbidden) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  if (!provider) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const result = validateProviderInput(raw);
  if (!result.ok) {
    return NextResponse.json({ ok: false, errors: result.errors }, { status: 422 });
  }

  // Members can never set their own featured state or approval.
  const patch = { ...result.data, featured: provider.featured };
  try {
    await updateProvider(id, patch);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to update member provider:", error);
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const { provider, forbidden } = await ownProvider(id, user.userId);
  if (forbidden) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  if (!provider) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  try {
    await deleteProvider(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete member provider:", error);
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 500 });
  }
}