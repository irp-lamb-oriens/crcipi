import { NextRequest } from "next/server";
import { getSessionUser, hasPermission, listUsers } from "@/lib/auth";
import { listAllArticles } from "@/lib/articles";
import { fail, ok } from "@/lib/http";
import { isLive, listAllJobs } from "@/lib/jobs";
import { listProviders } from "@/lib/providers";
import { getDailyStats, sumStats } from "@/lib/stats";

// GET /api/admin/overview?days=30 — platform KPIs, work queues and daily
// funnel series for the admin dashboard. Any admin may view it; queue links
// are flagged by the permissions the viewer actually holds.
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return fail("unauthorized", 401);

  const days = Math.min(Math.max(Number(request.nextUrl.searchParams.get("days")) || 30, 7), 90);
  const since = Date.now() - days * 24 * 60 * 60 * 1000;

  const [users, providers, jobs, articles, series] = await Promise.all([
    listUsers(),
    listProviders(),
    listAllJobs(),
    listAllArticles(),
    getDailyStats(days).catch(() => []),
  ]);

  const members = users.filter((u) => u.role === "member");

  return ok({
    days,
    totals: {
      members: members.length,
      newMembers: members.filter((u) => u.createdAt >= since).length,
      admins: users.filter((u) => u.role === "admin").length,
      providers: providers.length,
      listed: providers.filter((p) => p.approved).length,
      verified: providers.filter((p) => p.verified).length,
      reviews: providers.reduce((n, p) => n + p.ratingsCount, 0),
      liveJobs: jobs.filter((j) => isLive(j)).length,
      applications: jobs.reduce((n, j) => n + j.applicationsCount, 0),
      publishedArticles: articles.filter((a) => a.status === "published").length,
      articleViews: articles.reduce((n, a) => n + a.viewsCount, 0),
    },
    queues: {
      kyc: {
        count: providers.filter((p) => p.kycStatus === "submitted").length,
        allowed: hasPermission(user, "kyc.review"),
      },
      articles: {
        count: articles.filter((a) => a.status === "in_review").length,
        allowed: hasPermission(user, "articles.moderate"),
      },
      hiddenProviders: {
        count: providers.filter((p) => !p.approved).length,
        allowed: hasPermission(user, "providers.manage"),
      },
    },
    period: sumStats(series),
    series,
    topJobs: jobs
      .filter((j) => j.viewsCount > 0 || j.applicationsCount > 0)
      .sort((a, b) => b.applicationsCount - a.applicationsCount || b.viewsCount - a.viewsCount)
      .slice(0, 5)
      .map((j) => ({ id: j.id, title: j.title, company: j.providerName, views: j.viewsCount, applications: j.applicationsCount })),
    topArticles: articles
      .filter((a) => a.status === "published")
      .sort((a, b) => b.viewsCount - a.viewsCount)
      .slice(0, 5)
      .map((a) => ({ slug: a.slug, language: a.language, title: a.title, views: a.viewsCount })),
  });
}
