import { NextRequest } from "next/server";
import { getSessionUser, getUserById, hasPermission } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";
import { getKyc, reviewKyc } from "@/lib/kyc";
import { notify } from "@/lib/mailer";
import { getProvider } from "@/lib/providers";
import { recordEvent } from "@/lib/stats";
import { signedUrl } from "@/lib/storage";

// GET  /api/admin/kyc/:providerId — full record with short-lived document links.
// POST /api/admin/kyc/:providerId — { decision: "verify" | "reject", note }.
// Requires `kyc.review`.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!hasPermission(user, "kyc.review")) return fail("unauthorized", 401);

  const { id } = await params;
  const provider = await getProvider(id);
  if (!provider) return fail("not_found", 404);

  const kyc = await getKyc(id);
  const documents = await Promise.all(
    kyc.documents.map(async (doc) => ({ ...doc, url: await signedUrl(doc.path) }))
  );
  return ok({ provider, kyc: { ...kyc, documents } });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "kyc.review")) return fail("unauthorized", 401);

  const { id } = await params;
  const body = await readJson(request);
  const decision = body?.decision;
  if (decision !== "verify" && decision !== "reject") return fail("invalid_decision", 422);
  const note = typeof body?.note === "string" ? body.note : "";
  if (decision === "reject" && !note.trim()) {
    return fail("validation", 422, { errors: { note: "required" } });
  }

  const provider = await getProvider(id);
  if (!provider) return fail("not_found", 404);

  const kyc = await reviewKyc(id, decision, user.email, note);
  if (!kyc) return fail("not_submitted", 409);

  if (decision === "verify") recordEvent("kyc_verified");

  const owner = provider.ownerId ? await getUserById(provider.ownerId) : null;
  if (owner) {
    notify({
      to: owner.email,
      subject:
        decision === "verify"
          ? `${provider.name} is now a verified provider`
          : `Action needed on ${provider.name}'s verification`,
      heading: decision === "verify" ? "Your business is verified" : "Your verification needs changes",
      lines:
        decision === "verify"
          ? [`${provider.name} now shows the Verified badge in the CR-CIPI directory.`]
          : [`We couldn't verify ${provider.name} yet.`, `Reviewer's note: ${note.trim()}`],
      cta: { label: "Open my dashboard", url: "/account/verification" },
    });
  }

  return ok({ kyc });
}
