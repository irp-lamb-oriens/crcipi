import { getSessionUser, hasPermission, listUsers } from "@/lib/auth";
import { listAllArticles } from "@/lib/articles";
import { fail, ok } from "@/lib/http";
import { getKyc } from "@/lib/kyc";
import { listAllLeads, RESPONSE_TARGET_HOURS } from "@/lib/leads";
import { listAccessRequests } from "@/lib/onboarding";
import { listProviders } from "@/lib/providers";
import { ownerState } from "@/lib/providerMatch";

// GET /api/admin/reviews — one inbox for everything waiting on a person at
// the Chamber. Each section is included only when the admin holds the
// permission that acts on it.
export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return fail("unauthorized", 401);

  const can = {
    kyc: hasPermission(user, "kyc.review"),
    articles: hasPermission(user, "articles.moderate"),
    access: hasPermission(user, "users.manage"),
    leads: hasPermission(user, "providers.manage"),
  };

  const [providers, users] = await Promise.all([listProviders(), listUsers()]);
  const emailById = new Map(users.map((u) => [u.id, u.email]));
  const userMap = new Map(users.map((u) => [u.id, u]));
  const byId = new Map(providers.map((p) => [p.id, p]));

  const kyc = can.kyc
    ? await Promise.all(
        providers
          .filter((p) => p.kycStatus === "submitted")
          .map(async (p) => {
            const record = await getKyc(p.id);
            return {
              id: p.id,
              name: p.name,
              ownerEmail: p.ownerId ? (emailById.get(p.ownerId) ?? null) : null,
              legalName: record.legalName,
              documents: record.documents.length,
              since: record.submittedAt ?? record.updatedAt,
            };
          })
      )
    : null;

  const articles = can.articles
    ? (await listAllArticles())
        .filter((a) => a.status === "in_review")
        .map((a) => ({
          id: a.id,
          title: a.title,
          authorName: a.authorName,
          providerName: a.providerName,
          reasons: a.moderation?.reasons ?? [],
          since: a.submittedAt ?? a.updatedAt,
        }))
    : null;

  const access = can.access
    ? (await listAccessRequests("pending")).map((r) => {
        const provider = byId.get(r.providerId);
        return {
          id: r.id,
          providerId: r.providerId,
          providerName: r.providerName,
          name: r.name,
          email: r.email,
          note: r.note,
          ownerEmail: provider?.ownerId ? (emailById.get(provider.ownerId) ?? null) : null,
          owner: provider ? ownerState(provider, userMap) : "none",
          since: r.createdAt,
        };
      })
    : null;

  let staleLeads = null;
  if (can.leads) {
    const now = Date.now();
    const stale = (await listAllLeads(now - 60 * 24 * 3600_000)).filter(
      (l) => l.status === "new" && (now - l.createdAt) / 3600_000 > RESPONSE_TARGET_HOURS
    );
    const grouped = new Map<string, { count: number; since: number }>();
    for (const l of stale) {
      const g = grouped.get(l.providerId) ?? { count: 0, since: l.createdAt };
      g.count += 1;
      g.since = Math.min(g.since, l.createdAt);
      grouped.set(l.providerId, g);
    }
    staleLeads = [...grouped.entries()].map(([providerId, g]) => {
      const provider = byId.get(providerId);
      return {
        providerId,
        providerName: provider?.name ?? "",
        ownerEmail: provider?.ownerId ? (emailById.get(provider.ownerId) ?? null) : null,
        count: g.count,
        since: g.since,
      };
    });
  }

  const oldestFirst = <T extends { since: number }>(list: T[] | null) =>
    list ? [...list].sort((a, b) => a.since - b.since) : null;

  return ok({
    kyc: oldestFirst(kyc),
    articles: oldestFirst(articles),
    access: oldestFirst(access),
    staleLeads: oldestFirst(staleLeads),
  });
}
