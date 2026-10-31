import { getSessionUser } from "@/lib/auth";
import { listByAuthor } from "@/lib/articles";
import { fail, ok } from "@/lib/http";
import { isLive, listJobsByOwner } from "@/lib/jobs";
import { listLeadsByOwner } from "@/lib/leads";
import { listProvidersByOwner } from "@/lib/providers";

// GET /api/member/overview — everything the member dashboard home needs in
// one request: their businesses, verification, job funnel and article reach.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return fail("unauthorized", 401);

  const [providers, jobs, articles, leads] = await Promise.all([
    listProvidersByOwner(user.userId),
    listJobsByOwner(user.userId),
    listByAuthor(user.userId),
    listLeadsByOwner(user.userId),
  ]);
  const ownedIds = new Set(providers.map((p) => p.id));
  const myLeads = leads.filter((lead) => ownedIds.has(lead.providerId));

  const ratingsCount = providers.reduce((n, p) => n + p.ratingsCount, 0);
  const ratingsSum = providers.reduce((n, p) => n + p.ratingsSum, 0);

  return ok({
    name: user.name,
    businesses: providers.map((p) => ({
      id: p.id,
      name: p.name,
      approved: p.approved,
      verified: p.verified,
      kycStatus: p.kycStatus,
      ratingsCount: p.ratingsCount,
      average: p.ratingsCount ? Math.round((p.ratingsSum / p.ratingsCount) * 10) / 10 : null,
    })),
    reviews: {
      count: ratingsCount,
      average: ratingsCount ? Math.round((ratingsSum / ratingsCount) * 10) / 10 : null,
    },
    jobs: {
      live: jobs.filter((job) => isLive(job)).length,
      total: jobs.length,
      views: jobs.reduce((n, j) => n + j.viewsCount, 0),
      applications: jobs.reduce((n, j) => n + j.applicationsCount, 0),
    },
    leads: {
      new: myLeads.filter((l) => l.status === "new").length,
      overdue: myLeads.filter((l) => l.status === "new" && Date.now() - l.createdAt > 24 * 3600_000).length,
      won: myLeads.filter((l) => l.status === "won").length,
      total: myLeads.length,
    },
    articles: {
      published: articles.filter((a) => a.status === "published").length,
      inReview: articles.filter((a) => a.status === "in_review").length,
      needsChanges: articles.filter((a) => a.status === "rejected").length,
      views: articles.reduce((n, a) => n + a.viewsCount, 0),
    },
  });
}
