import { getSessionUser, hasPermission } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { listAllJobs } from "@/lib/jobs";

// GET /api/admin/jobs — every posting with its funnel counts. `jobs.manage`.
export async function GET() {
  if (!hasPermission(await getSessionUser(), "jobs.manage")) return fail("unauthorized", 401);
  return ok({ jobs: await listAllJobs() });
}
