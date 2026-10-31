import { NextRequest } from "next/server";
import { getSessionUser, hasPermission } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";
import { getJob, updateJob } from "@/lib/jobs";

// PATCH /api/admin/jobs/:id — { status: "removed" | "published" } takedown or
// restore. Admins never edit the content of a member's posting.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!hasPermission(await getSessionUser(), "jobs.manage")) return fail("unauthorized", 401);
  const { id } = await params;
  const job = await getJob(id);
  if (!job) return fail("not_found", 404);

  const body = await readJson(request);
  const status = body?.status;
  if (status !== "removed" && status !== "published") return fail("invalid_status", 422);
  await updateJob(job, { status });
  return ok({ job: await getJob(id) });
}
