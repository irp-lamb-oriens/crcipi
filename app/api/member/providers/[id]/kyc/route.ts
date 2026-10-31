import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";
import { getKyc, saveKyc, validateKyc } from "@/lib/kyc";
import { notify } from "@/lib/mailer";
import { getProvider } from "@/lib/providers";
import { recordEvent } from "@/lib/stats";
import { signedUrl } from "@/lib/storage";
import { site } from "@/content/site";

// GET /api/member/providers/:id/kyc — the owner's verification record.
// PUT /api/member/providers/:id/kyc — save a draft, or submit (body.submit).
// Owner-only, like every /api/member/providers/:id route.

async function ownedProvider(id: string) {
  const user = await getSessionUser();
  if (!user) return { error: fail("unauthorized", 401) } as const;
  const provider = await getProvider(id);
  if (!provider) return { error: fail("not_found", 404) } as const;
  if (provider.ownerId !== user.userId) return { error: fail("forbidden", 403) } as const;
  return { user, provider } as const;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const owned = await ownedProvider(id);
  if ("error" in owned) return owned.error;

  const kyc = await getKyc(id);
  const documents = await Promise.all(
    kyc.documents.map(async (doc) => ({ ...doc, url: await signedUrl(doc.path) }))
  );
  return ok({ kyc: { ...kyc, documents }, category: owned.provider.category });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const owned = await ownedProvider(id);
  if ("error" in owned) return owned.error;

  const body = await readJson(request);
  if (!body) return fail("invalid_json", 400);
  const submit = body.submit === true;

  const result = validateKyc(body, {
    submit,
    category: owned.provider.category,
    ownerFolder: `private/kyc/${owned.user.userId}`,
  });
  if (!result.ok) return fail("validation", 422, { errors: result.errors });

  try {
    const kyc = await saveKyc(id, result.data, submit);
    if (submit) {
      recordEvent("kyc_submitted");
      for (const to of site.notifyEmails) {
        notify({
          to,
          subject: `Verification request: ${owned.provider.name}`,
          heading: "A member submitted a business for verification",
          lines: [
            `${owned.provider.name} (${result.data.legalName}) is waiting for a KYC review.`,
            `Submitted by ${owned.user.email}.`,
          ],
          cta: { label: "Review it", url: "/admin/verification" },
        });
      }
    }
    return ok({ kyc });
  } catch (error) {
    console.error("kyc save failed", error);
    return fail("storage_failed", 500);
  }
}
