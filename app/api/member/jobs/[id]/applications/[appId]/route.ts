import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/jobOptions";
import { getJob, setApplicationStatus } from "@/lib/jobs";

// PATCH /api/member/jobs/:id/applications/:appId — { status } pipeline stage.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; appId: string }> }
) {
  const user = await getSessionUser();
  if (!user) return fail("unauthorized", 401);
  const { id, appId } = await params;
  const job = await getJob(id);
  if (!job) return fail("not_found", 404);
  if (job.ownerId !== user.userId) return fail("forbidden", 403);

  const body = await readJson(request);
  const status = body?.status as ApplicationStatus;
  if (!(APPLICATION_STATUSES as readonly string[]).includes(status)) return fail("invalid_status", 422);

  return (await setApplicationStatus(id, appId, status)) ? ok() : fail("not_found", 404);
}
