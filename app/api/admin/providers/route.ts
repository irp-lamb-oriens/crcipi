import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import {
  createProvider,
  listProviders,
  validateProviderInput,
} from "@/lib/providers";

// GET /api/admin/providers — list all providers (including unapproved).
// POST /api/admin/providers — create a provider.

export async function GET() {
  if (!(await requirePermission("providers.manage"))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const providers = await listProviders();
  const summary = providers.map((provider) => ({
    id: provider.id,
    name: provider.name,
    category: provider.category,
    featured: provider.featured,
    approved: provider.approved,
    ratingsCount: provider.ratingsCount,
    ratingsSum: provider.ratingsSum,
  }));
  return NextResponse.json({ ok: true, providers: summary });
}

export async function POST(request: NextRequest) {
  if (!(await requirePermission("providers.manage"))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
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

  try {
    const provider = await createProvider(result.data);
    return NextResponse.json({ ok: true, provider }, { status: 201 });
  } catch (error) {
    console.error("Failed to create provider:", error);
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 500 });
  }
}