import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/firebaseAdmin";
import { fail, ok, readJson } from "@/lib/http";
import { isValidLegalId, normalizeLegalId, saveKyc } from "@/lib/kyc";
import { EMPTY_KYC, LEGAL_ID_TYPES, type LegalIdType } from "@/lib/kycOptions";
import { findProviderByLegalId, LANGUAGES } from "@/lib/onboarding";
import { createOwnedProvider, validateProviderInput } from "@/lib/providers";
import { recordEvent } from "@/lib/stats";
import { findSimilarListings } from "@/lib/providerMatch";

// POST /api/member/onboarding/company
// { legalIdType, legalId, legalName?, name, category, location, languages[],
//   email, description, locale }
// Creates the member's company listing and starts its verification record
// with the legal id already filled in.
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return fail("unauthorized", 401);
  const body = await readJson(request);
  if (!body) return fail("invalid_json", 400);

  const type = (LEGAL_ID_TYPES as readonly unknown[]).includes(body.legalIdType)
    ? (body.legalIdType as LegalIdType)
    : "juridica";
  const legalId = String(body.legalId ?? "");
  const errors: Record<string, string> = {};
  if (!isValidLegalId(type, legalId)) errors.legalId = "invalid";

  const description = String(body.description ?? "").trim();
  const result = validateProviderInput({
    name: body.name,
    category: body.category,
    location: body.location,
    email: body.email,
    // One description to start; the member can translate it later.
    descriptionEn: description,
    descriptionEs: description,
  });
  if (!result.ok) Object.assign(errors, result.errors);
  if (description.length < 30) errors.description = "too_short";

  const languages = Array.isArray(body.languages)
    ? (body.languages as unknown[]).filter((l): l is string => (LANGUAGES as readonly unknown[]).includes(l))
    : [];
  if (languages.length === 0) errors.languages = "required";

  if (Object.keys(errors).length > 0 || !result.ok) return fail("validation", 422, { errors });

  const existing = await findProviderByLegalId(type, legalId);
  if (existing) {
    return fail("exists", 409, {
      provider: { id: existing.id, name: existing.name },
      mine: existing.ownerId === user.userId,
    });
  }

  if (body.confirmDistinct !== true) {
    const matches = await findSimilarListings(result.data, user.userId);
    if (matches.length > 0) return fail("similar", 409, { matches });
  }

  const outcome = await createOwnedProvider(result.data, user.userId);
  if (!outcome.created) {
    return fail("exists", 409, { provider: { id: outcome.existing.id, name: outcome.existing.name }, mine: true });
  }
  const provider = outcome.provider;
  await db.collection("providers").doc(provider.id).set({ languages, onboardedAt: Date.now() }, { merge: true });
  await saveKyc(
    provider.id,
    {
      ...EMPTY_KYC,
      legalIdType: type,
      legalId: normalizeLegalId(type, legalId),
      legalName: String(body.legalName ?? "").trim().slice(0, 200),
    },
    false
  );
  recordEvent("provider_created");

  return ok({ provider: { id: provider.id, name: provider.name } }, 201);
}
