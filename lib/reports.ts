import "server-only";

import { listAllArticles } from "@/lib/articles";
import { listAllJobs } from "@/lib/jobs";
import { listAllLeads, listLeadsByOwner, median, responseHours, type Lead } from "@/lib/leads";
import { getProviderMonth, PROVIDER_COUNTERS, type ProviderCounter } from "@/lib/providerStats";
import { listProviders, listProvidersByOwner, listRatings } from "@/lib/providers";
import { getStatsBetween } from "@/lib/stats";
import { scoreProvider } from "@/lib/trustScore";

// ============================================================
// Monthly reports: one for the Board, one per member.
// A month is "YYYY-MM" in UTC, matching the daily stats keys.
// ============================================================

export function parseMonth(raw: string | null | undefined, now = Date.now()): string {
  if (raw && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw)) return raw;
  return new Date(now).toISOString().slice(0, 7);
}

export function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  const start = Date.UTC(y, m - 1, 1);
  const end = Date.UTC(y, m, 1); // exclusive
  const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  const lastDay = new Date(end - 1).toISOString().slice(0, 10);
  return { start, end, prev, firstDay: `${month}-01`, lastDay };
}

function leadSummary(leads: Lead[]) {
  const answered = leads.filter((l) => l.firstResponseAt !== null);
  const hours = answered.map((l) => responseHours(l) as number);
  return {
    received: leads.length,
    answered: answered.length,
    medianReplyHours: median(hours),
    won: leads.filter((l) => l.status === "won").length,
  };
}

function inMonth(t: number | null | undefined, b: { start: number; end: number }) {
  return typeof t === "number" && t >= b.start && t < b.end;
}

export async function boardReport(month: string) {
  const b = monthBounds(month);
  const pb = monthBounds(b.prev);
  const [stats, prevStats, providers, leads, articles, jobs] = await Promise.all([
    getStatsBetween(b.firstDay, b.lastDay),
    getStatsBetween(pb.firstDay, pb.lastDay),
    listProviders(),
    listAllLeads(pb.start),
    listAllArticles(),
    listAllJobs(),
  ]);
  const listed = providers.filter((p) => p.approved && p.memberSince < b.end);
  const monthLeads = leads.filter((l) => inMonth(l.createdAt, b));
  const prevLeads = leads.filter((l) => inMonth(l.createdAt, pb));
  const byProvider = new Map<string, Lead[]>();
  for (const l of monthLeads) byProvider.set(l.providerId, [...(byProvider.get(l.providerId) ?? []), l]);

  const topMembers = [...byProvider.entries()]
    .map(([id, list]) => {
      const p = providers.find((x) => x.id === id);
      return { id, name: p?.name ?? list[0].providerName, verified: !!p?.verified, ...leadSummary(list) };
    })
    .sort((a, b2) => b2.received - a.received)
    .slice(0, 5);

  return {
    month,
    previous: b.prev,
    membership: {
      listed: listed.length,
      newCompanies: providers.filter((p) => inMonth(p.memberSince, b)).length,
      verified: listed.filter((p) => p.verified).length,
      signups: stats.member_signup,
      signupsPrev: prevStats.member_signup,
      verificationsApproved: stats.kyc_verified,
    },
    demand: {
      directoryViews: stats.directory_view,
      profileViews: stats.profile_view,
      profileViewsPrev: prevStats.profile_view,
      ...leadSummary(monthLeads),
      receivedPrev: prevLeads.length,
      reviews: stats.review_submitted,
    },
    talent: {
      jobsPosted: jobs.filter((j) => inMonth(j.publishedAt, b)).length,
      jobViews: stats.job_view,
      applications: stats.job_apply,
    },
    content: {
      published: articles.filter((a) => a.status === "published" && inMonth(a.publishedAt, b)).length,
      reads: stats.article_view,
    },
    topMembers,
  };
}

export async function memberReport(userId: string, month: string) {
  const b = monthBounds(month);
  const pb = monthBounds(b.prev);
  const [providers, leads] = await Promise.all([listProvidersByOwner(userId), listLeadsByOwner(userId)]);
  const owned = new Set(providers.map((p) => p.id));
  const mine = leads.filter((l) => owned.has(l.providerId));

  const sumCounters = async (m: string) => {
    const all = await Promise.all(providers.map((p) => getProviderMonth(p.id, m)));
    return Object.fromEntries(
      PROVIDER_COUNTERS.map((c) => [c, all.reduce((n, x) => n + x[c], 0)])
    ) as Record<ProviderCounter, number>;
  };

  const [counters, prevCounters, ratings, scores] = await Promise.all([
    sumCounters(month),
    sumCounters(b.prev),
    Promise.all(providers.map((p) => listRatings(p.id, { approvedOnly: true }))).then((r) => r.flat()),
    Promise.all(providers.map(async (p) => ({ id: p.id, name: p.name, verified: p.verified, score: await scoreProvider(p) }))),
  ]);

  const monthLeads = mine.filter((l) => inMonth(l.createdAt, b));
  const monthReviews = ratings.filter((r) => inMonth(r.createdAt, b));

  return {
    month,
    previous: b.prev,
    businesses: scores.map((s) => ({
      id: s.id,
      name: s.name,
      verified: s.verified,
      score: s.score.total,
      pillars: Object.fromEntries(Object.entries(s.score.pillars).map(([k, v]) => [k, v.score])),
      next: Object.values(s.score.pillars).flatMap((p) => p.missing).slice(0, 3),
    })),
    reach: {
      profileViews: counters.profileViews,
      profileViewsPrev: prevCounters.profileViews,
      articleReads: counters.articleReads,
      jobViews: counters.jobViews,
      applications: counters.applications,
    },
    leads: {
      ...leadSummary(monthLeads),
      receivedPrev: mine.filter((l) => inMonth(l.createdAt, pb)).length,
    },
    reviews: {
      count: monthReviews.length,
      average: monthReviews.length
        ? Math.round((monthReviews.reduce((n, r) => n + r.rating, 0) / monthReviews.length) * 10) / 10
        : null,
    },
  };
}
