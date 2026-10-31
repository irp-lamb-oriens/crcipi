import { NextRequest } from "next/server";
import { getSessionUser, hasPermission } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { getJob, listApplications } from "@/lib/jobs";
import { signedUrl } from "@/lib/storage";

// GET /api/member/jobs/:id/applications — applicants for a posting, with
// short-lived CV links. Job owner, or an admin holding `jobs.manage`.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return fail("unauthorized", 401);
  const { id } = await params;
  const job = await getJob(id);
  if (!job) return fail("not_found", 404);
  if (job.ownerId !== user.userId && !hasPermission(user, "jobs.manage")) {
    return fail("forbidden", 403);
  }

  const applications = await listApplications(id);
  return ok({
    applications: await Promise.all(
      applications.map(async (app) => ({
        ...app,
        cv: app.cv ? { name: app.cv.name, url: await signedUrl(app.cv.path) } : null,
      }))
    ),
  });
}
