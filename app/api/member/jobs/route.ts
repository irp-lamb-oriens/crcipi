import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";
import { createJob, listJobsByOwner, validateJobInput } from "@/lib/jobs";
import { getProvider } from "@/lib/providers";
import { recordEvent } from "@/lib/stats";

// GET  /api/member/jobs — the signed-in member's postings (with funnel counts).
// POST /api/member/jobs — create a posting for one of the member's businesses.

export async function GET() {
  const user = await getSessionUser();
  if (!user) return fail("unauthorized", 401);
  return ok({ jobs: await listJobsByOwner(user.userId), defaultApplyEmail: user.email });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return fail("unauthorized", 401);

  const body = await readJson(request);
  if (!body) return fail("invalid_json", 400);
  const result = validateJobInput(body);
  if (!result.ok) return fail("validation", 422, { errors: result.errors });

  const provider = await getProvider(result.data.providerId);
  if (!provider || provider.ownerId !== user.userId) {
    return fail("validation", 422, { errors: { providerId: "not_yours" } });
  }
  if (!provider.approved) {
    return fail("validation", 422, { errors: { providerId: "not_approved" } });
  }

  try {
    const job = await createJob(result.data, { ownerId: user.userId, providerName: provider.name });
    if (job.status === "published") recordEvent("job_posted");
    return ok({ job }, 201);
  } catch (error) {
    console.error("job create failed", error);
    return fail("storage_failed", 500);
  }
}
