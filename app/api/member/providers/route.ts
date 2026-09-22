import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  createProvider,
  listProvidersByOwner,
  validateProviderInput,
} from "@/lib/providers";

// GET  /api/member/providers — list the signed-in member's own providers.
// POST /api/member/providers — create a provider owned by the member.
//
// Members may only read and mutate their own businesses. Newly created
// providers are published immediately; admins can hide them later from the
// admin console if needed.

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const providers = await listProvidersByOwner(user.userId);
  const summary = providers.map((provider) => ({
    id: provider.id,
    name: provider.name,
    category: provider.category,
    descriptionEn: provider.descriptionEn,
    descriptionEs: provider.descriptionEs,
    website: provider.website,
    email: provider.email,
    phone: provider.phone,
    location: provider.location,
    logoUrl: provider.logoUrl,
    featured: provider.featured,
    approved: provider.approved,
    memberSince: provider.memberSince,
  }));

  return NextResponse.json({ ok: true, providers: summary });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
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

  // Members cannot self-feature. Ownership is pinned to the session user;
  // new submissions go live right away.
  const data = { ...result.data, featured: false };

  try {
    const provider = await createProvider(data, {
      ownerId: user.userId,
      approved: true,
    });
    return NextResponse.json({ ok: true, provider }, { status: 201 });
  } catch (error) {
    console.error("Failed to create member provider:", error);
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 500 });
  }
}