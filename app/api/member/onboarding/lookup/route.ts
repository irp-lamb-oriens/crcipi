import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";
import { isValidLegalId } from "@/lib/kyc";
import { LEGAL_ID_TYPES, type LegalIdType } from "@/lib/kycOptions";
import { findProviderByLegalId } from "@/lib/onboarding";
import { rateLimit } from "@/lib/rateLimit";

// POST /api/member/onboarding/lookup — { legalIdType, legalId }
// Is this company already on CR-CIPI? Signed-in members only, and limited
// per member so the endpoint can't be used to enumerate legal ids.
const LOOKUP_LIMIT = { max: 15, windowMs: 60 * 60 * 1000, baseBackoffMs: 5 * 60 * 1000 };

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return fail("unauthorized", 401);
  const body = await readJson(request);
  if (!body) return fail("invalid_json", 400);

  const type = (LEGAL_ID_TYPES as readonly unknown[]).includes(body.legalIdType)
    ? (body.legalIdType as LegalIdType)
    : "juridica";
  const legalId = String(body.legalId ?? "");
  if (!isValidLegalId(type, legalId)) return fail("validation", 422, { errors: { legalId: "invalid" } });

  const limit = await rateLimit(`lookup:${user.userId}`, LOOKUP_LIMIT);
  if (!limit.ok) return fail("rate_limited", 429);

  const found = await findProviderByLegalId(type, legalId);
  if (!found) return ok({ exists: false });
  return ok({
    exists: true,
    provider: { id: found.id, name: found.name },
    mine: found.ownerId === user.userId,
  });
}
