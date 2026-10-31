import { getSessionUser, hasPermission, listUsers } from "@/lib/auth";
import { listPublished } from "@/lib/articles";
import { fail, ok } from "@/lib/http";
import { listLiveJobs } from "@/lib/jobs";
import { listAllLeads, RESPONSE_TARGET_HOURS } from "@/lib/leads";
import { listProviders } from "@/lib/providers";
import { computeTrustScore, PILLARS, storeTrustSnapshot } from "@/lib/trustScore";

// GET /api/admin/members — every company with its health: trust score per
// pillar, reply time, lead flow and last activity. Requires providers.manage.
export async function GET() {
  const user = await getSessionUser();
  if (!hasPermission(user, "providers.manage")) return fail("unauthorized", 401);

  const now = Date.now();
  const [providers, users, leads, articles, jobs] = await Promise.all([
    listProviders(),
    listUsers(),
    listAllLeads(now - 365 * 24 * 3600_000),
    listPublished(),
    listLiveJobs(),
  ]);
  const emailById = new Map(users.map((u) => [u.id, u.email]));
  const group = <T extends { providerId: string | null }>(list: T[]) => {
    const m = new Map<string, T[]>();
    for (const item of list) {
      if (!item.providerId) continue;
      m.set(item.providerId, [...(m.get(item.providerId) ?? []), item]);
    }
    return m;
  };
  const leadsBy = group(leads);
  const articlesBy = group(articles);
  const jobsBy = group(jobs);

  const members = providers.map((p) => {
    const pl = leadsBy.get(p.id) ?? [];
    const pa = articlesBy.get(p.id) ?? [];
    const pj = jobsBy.get(p.id) ?? [];
    const score = computeTrustScore(p, { leads: pl, articles: pa, jobs: pj }, now);
    if (score.total !== p.trustScore) void storeTrustSnapshot(p.id, score).catch(() => {});
    const lastActivity = Math.max(
      p.memberSince,
      ...pl.map((l) => l.firstResponseAt ?? 0),
      ...pa.map((a) => a.publishedAt ?? 0),
      ...pj.map((j) => j.publishedAt ?? 0)
    );
    return {
      id: p.id,
      name: p.name,
      category: p.category,
      approved: p.approved,
      verified: p.verified,
      kycStatus: p.kycStatus,
      ownerEmail: p.ownerId ? (emailById.get(p.ownerId) ?? null) : null,
      score: score.total,
      pillars: Object.fromEntries(PILLARS.map((k) => [k, score.pillars[k].score])),
      replyHours: p.responseSample > 0 ? p.responseHoursMedian : null,
      leads: {
        total: pl.length,
        waiting: pl.filter((l) => l.status === "new" && (now - l.createdAt) / 3600_000 > RESPONSE_TARGET_HOURS).length,
        won: pl.filter((l) => l.status === "won").length,
      },
      rating: p.ratingsCount ? Math.round((p.ratingsSum / p.ratingsCount) * 10) / 10 : null,
      reviews: p.ratingsCount,
      lastActivity,
    };
  });

  const listed = providers.filter((p) => p.approved);
  return ok({
    members,
    summary: {
      total: listed.length,
      verified: listed.filter((p) => p.verified).length,
      waiting: members.reduce((n, m) => n + m.leads.waiting, 0),
      medianScore: (() => {
        const s = members.filter((m) => m.approved).map((m) => m.score).sort((a, b) => a - b);
        return s.length ? s[Math.floor(s.length / 2)] : null;
      })(),
    },
  });
}
