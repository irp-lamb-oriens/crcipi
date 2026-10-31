import { requireAdmin } from "@/lib/auth";
import { listAllArticles } from "@/lib/articles";
import type { AdminProgressKey } from "@/lib/guides";
import { fail, ok } from "@/lib/http";
import { listAllLeads, median, responseHours, RESPONSE_TARGET_HOURS } from "@/lib/leads";
import { listAccessRequests } from "@/lib/onboarding";
import { listProviders } from "@/lib/providers";

// GET /api/admin/progress — facts behind the Chamber's checklists.
export async function GET() {
  if (!(await requireAdmin())) return fail("unauthorized", 401);
  const since = Date.now() - 90 * 24 * 3600_000;
  const [all, articles, access, leads] = await Promise.all([
    listProviders(),
    listAllArticles(),
    listAccessRequests("pending"),
    listAllLeads(since),
  ]);
  const providers = all.filter((p) => p.approved);
  const replies = leads.map(responseHours).filter((h): h is number => h !== null);
  const medianReply = median(replies);
  const now = Date.now();

  const progress: Record<AdminProgressKey, boolean> = {
    kycQueueClear: !all.some((p) => p.kycStatus === "submitted"),
    articleQueueClear: !articles.some((a) => a.status === "in_review"),
    accessQueueClear: access.length === 0,
    membersVerified: providers.length > 0 && providers.filter((p) => p.verified).length / providers.length > 0.5,
    staleLeadsNone: !leads.some(
      (l) => l.status === "new" && (now - l.createdAt) / 3600_000 > RESPONSE_TARGET_HOURS
    ),
    replyTimeHealthy: medianReply !== null && medianReply < RESPONSE_TARGET_HOURS,
  };
  return ok({ progress });
}
