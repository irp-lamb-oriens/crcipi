import { getSessionUser } from "@/lib/auth";
import { listByAuthor } from "@/lib/articles";
import type { MemberProgressKey } from "@/lib/guides";
import { fail, ok } from "@/lib/http";
import { listApplications, listJobsByOwner } from "@/lib/jobs";
import { listLeadsByOwner } from "@/lib/leads";
import { listProvidersByOwner } from "@/lib/providers";

// GET /api/member/progress — the facts behind every module checklist.
// Checklists tick from real data only.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return fail("unauthorized", 401);

  const [providers, jobs, articles, leads] = await Promise.all([
    listProvidersByOwner(user.userId),
    listJobsByOwner(user.userId),
    listByAuthor(user.userId),
    listLeadsByOwner(user.userId),
  ]);
  const owned = new Set(providers.map((p) => p.id));
  const myLeads = leads.filter((l) => owned.has(l.providerId));
  const posted = jobs.filter((j) => j.status !== "draft");
  const applications = (await Promise.all(posted.slice(0, 10).map((j) => listApplications(j.id)))).flat();

  const progress: Record<MemberProgressKey, boolean> = {
    hasBusiness: providers.length > 0,
    profileComplete: providers.some((p) => p.logoUrl && (p.website || p.phone) && p.location),
    translated: providers.some(
      (p) => p.descriptionEn.trim() && p.descriptionEs.trim() && p.descriptionEn.trim() !== p.descriptionEs.trim()
    ),
    kycStarted: providers.some((p) => p.kycStatus !== "none"),
    kycSubmitted: providers.some((p) => ["submitted", "verified", "rejected"].includes(p.kycStatus)),
    verified: providers.some((p) => p.verified),
    leadAnswered: myLeads.some((l) => l.firstResponseAt !== null),
    leadClosed: myLeads.some((l) => l.status === "won" || l.status === "lost"),
    reviewReceived: providers.some((p) => p.ratingsCount > 0),
    jobPosted: posted.length > 0,
    applicantMoved: applications.some((a) => a.status !== "new"),
    articleSubmitted: articles.some((a) => a.status !== "draft"),
    articlePublished: articles.some((a) => a.status === "published"),
    articleShared: articles.some((a) => a.viewsCount >= 10),
  };
  return ok({ progress });
}
