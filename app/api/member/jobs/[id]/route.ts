import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";
import { deleteJob, getJob, isLive, updateJob, validateJobInput } from "@/lib/jobs";
import { getProvider } from "@/lib/providers";
import { recordEvent } from "@/lib/stats";
import { deleteStoredFile } from "@/lib/storage";

// PATCH  /api/member/jobs/:id — edit, publish or close own posting.
// DELETE /api/member/jobs/:id — delete own posting and its applications.
// A posting an admin removed stays removed: the member can no longer edit it.

async function ownedJob(id: string) {
  const user = await getSessionUser();
  if (!user) return { error: fail("unauthorized", 401) } as const;
  const job = await getJob(id);
  if (!job) return { error: fail("not_found", 404) } as const;
  if (job.ownerId !== user.userId) return { error: fail("forbidden", 403) } as const;
  return { user, job } as const;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await ownedJob(id);
  if ("error" in owned) return owned.error;
  if (owned.job.status === "removed") return fail("removed_by_admin", 409);

  const body = await readJson(request);
  if (!body) return fail("invalid_json", 400);
  const result = validateJobInput({ ...owned.job, ...body });
  if (!result.ok) return fail("validation", 422, { errors: result.errors });

  const provider = await getProvider(result.data.providerId);
  if (!provider || provider.ownerId !== owned.user.userId) {
    return fail("validation", 422, { errors: { providerId: "not_yours" } });
  }

  try {
    const wasLive = isLive(owned.job);
    await updateJob(owned.job, { ...result.data, providerName: provider.name });
    if (!wasLive && result.data.status === "published") recordEvent("job_posted");
    return ok({ job: await getJob(id) });
  } catch (error) {
    console.error("job update failed", error);
    return fail("storage_failed", 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await ownedJob(id);
  if ("error" in owned) return owned.error;
  try {
    const cvPaths = await deleteJob(id);
    await Promise.all(cvPaths.map(deleteStoredFile));
    return ok();
  } catch (error) {
    console.error("job delete failed", error);
    return fail("storage_failed", 500);
  }
}
