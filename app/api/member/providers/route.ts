import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  createOwnedProvider,
  isMediaPath,
  listProvidersByOwner,
  validateProviderInput,
} from "@/lib/providers";
import { recordEvent } from "@/lib/stats";

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
    verified: provider.verified,
    kycStatus: provider.kycStatus,
    ratingsCount: provider.ratingsCount,
    ratingsSum: provider.ratingsSum,
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
  // new submissions go live right away. Same owner + same name is the same
  // business: a double-click or re-submit returns the existing one (409).
  if (!isOwnMediaPath(result.data.logoUrl, user.userId)) {
    return NextResponse.json({ ok: false, errors: { logoUrl: "invalid" } }, { status: 422 });
  }
  try {
    const outcome = await createOwnedProvider({ ...result.data, featured: false }, user.userId);
    if (!outcome.created) {
      return NextResponse.json(
        { ok: false, error: "duplicate", provider: { id: outcome.existing.id, name: outcome.existing.name } },
        { status: 409 }
      );
    }
    recordEvent("provider_created");
    return NextResponse.json({ ok: true, provider: outcome.provider }, { status: 201 });
  } catch (error) {
    console.error("Failed to create member provider:", error);
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 500 });
  }
}
// A relative logo path from our storage must be one this member uploaded.
function isOwnMediaPath(logoUrl: string | undefined, userId: string): boolean {
  if (!logoUrl || !isMediaPath(logoUrl)) return true;
  return logoUrl.startsWith(`/api/media/public/images/${userId}/`);
}
