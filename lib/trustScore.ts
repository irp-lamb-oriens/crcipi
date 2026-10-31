import "server-only";

import { db } from "@/lib/firebaseAdmin";
import type { Article } from "@/lib/articles";
import type { Job } from "@/lib/jobs";
import { RESPONSE_TARGET_HOURS, type Lead } from "@/lib/leads";
import type { Provider } from "@/lib/providers";

// ============================================================
// Sello de confianza: the trust score.
//
// Five pillars of 20 points each, every one computed from data the platform
// already holds (never self-declared):
//
//   legal          verification outcome (KYC)
//   profile        what an investor can learn before writing
//   responsiveness median first-reply time, minus overdue leads
//   reviews        verified client reviews
//   activity       recent articles, open roles, answered leads
//
// A snapshot (trustScore) is stored on the provider whenever it is computed,
// so the directory can sort by it without recomputing every listing.
// ============================================================

export const PILLARS = ["legal", "profile", "responsiveness", "reviews", "activity"] as const;
export type Pillar = (typeof PILLARS)[number];

export interface PillarScore {
  score: number; // 0–20
  // What earned points, and what would earn more. Shown to the member.
  earned: string[];
  missing: string[];
}

export interface TrustScore {
  total: number; // 0–100
  pillars: Record<Pillar, PillarScore>;
}

const DAY = 24 * 3600_000;

function clamp(n: number) {
  return Math.max(0, Math.min(20, Math.round(n)));
}

export function computeTrustScore(
  provider: Provider,
  data: { leads: Lead[]; articles: Article[]; jobs: Job[] },
  now = Date.now()
): TrustScore {
  // --- Legal
  const legal: PillarScore = { score: 0, earned: [], missing: [] };
  if (provider.verified) {
    legal.score = 20;
    legal.earned.push("Verified by CR-CIPI");
  } else if (provider.kycStatus === "submitted") {
    legal.score = 8;
    legal.earned.push("Verification submitted");
    legal.missing.push("Approval by the CR-CIPI team");
  } else if (provider.kycStatus === "draft" || provider.kycStatus === "rejected") {
    legal.score = 3;
    legal.earned.push("Verification started");
    legal.missing.push("Submit your documents for review");
  } else {
    legal.missing.push("Start verification");
  }

  // --- Profile
  const profile: PillarScore = { score: 0, earned: [], missing: [] };
  const en = provider.descriptionEn.trim();
  const es = provider.descriptionEs.trim();
  if (en && es && en !== es) {
    profile.score += 6;
    profile.earned.push("Description in English and Spanish");
  } else if (en || es) {
    profile.score += 3;
    profile.earned.push("Description");
    profile.missing.push("Translate your description");
  } else profile.missing.push("Write a description");
  const add = (cond: boolean, pts: number, yes: string, no: string) => {
    if (cond) {
      profile.score += pts;
      profile.earned.push(yes);
    } else profile.missing.push(no);
  };
  add(!!provider.logoUrl, 4, "Logo", "Add a logo");
  add(!!(provider.website || provider.phone), 4, "Website or phone", "Add a website or phone");
  add(!!provider.location, 3, "Location", "Add your location");
  add(provider.languages.length > 0, 3, "Languages served", "List the languages you serve in");
  profile.score = clamp(profile.score);

  // --- Responsiveness
  const responsiveness: PillarScore = { score: 0, earned: [], missing: [] };
  const h = provider.responseSample > 0 ? provider.responseHoursMedian : null;
  if (h === null) {
    // Not measured yet: half credit, so new members aren't punished for
    // not having received a request.
    responsiveness.score = 10;
    responsiveness.earned.push("Not measured yet");
    responsiveness.missing.push("Answer your first consultation request");
  } else if (h <= 6) {
    responsiveness.score = 20;
    responsiveness.earned.push("Replies within 6 hours");
  } else if (h <= RESPONSE_TARGET_HOURS) {
    responsiveness.score = 15;
    responsiveness.earned.push("Replies within a day");
    responsiveness.missing.push("Reply within 6 hours");
  } else if (h <= 48) {
    responsiveness.score = 8;
    responsiveness.missing.push("Reply within 24 hours");
  } else {
    responsiveness.score = 3;
    responsiveness.missing.push("Reply within 24 hours");
  }
  const overdue = data.leads.filter(
    (l) => l.status === "new" && (now - l.createdAt) / 3600_000 > RESPONSE_TARGET_HOURS
  ).length;
  if (overdue > 0) {
    responsiveness.score -= 5 * overdue;
    responsiveness.missing.push(`${overdue} request${overdue === 1 ? "" : "s"} waiting over 24 h`);
  }
  responsiveness.score = clamp(responsiveness.score);

  // --- Reviews
  const reviews: PillarScore = { score: 0, earned: [], missing: [] };
  if (provider.ratingsCount > 0) {
    const avg = provider.ratingsSum / provider.ratingsCount;
    reviews.score = clamp((avg / 5) * 15 + Math.min(provider.ratingsCount, 5));
    reviews.earned.push(`${avg.toFixed(1)} average from ${provider.ratingsCount} verified review${provider.ratingsCount === 1 ? "" : "s"}`);
    if (provider.ratingsCount < 5) reviews.missing.push("Reach 5 verified reviews");
  } else {
    reviews.missing.push("Mark won leads so clients are invited to review you");
  }

  // --- Activity
  const activity: PillarScore = { score: 0, earned: [], missing: [] };
  const recentArticle = data.articles.some(
    (a) => a.status === "published" && (a.publishedAt ?? 0) > now - 180 * DAY
  );
  if (recentArticle) {
    activity.score += 8;
    activity.earned.push("Article in the last 6 months");
  } else activity.missing.push("Publish an article");
  if (data.jobs.length > 0) {
    activity.score += 4;
    activity.earned.push("Open role on the job board");
  }
  if (data.leads.some((l) => l.firstResponseAt !== null && l.firstResponseAt > now - 90 * DAY)) {
    activity.score += 8;
    activity.earned.push("Answered a request in the last 90 days");
  } else activity.missing.push("Answer a consultation request");
  activity.score = clamp(activity.score);

  const pillars = { legal, profile, responsiveness, reviews, activity };
  const total = PILLARS.reduce((n, p) => n + pillars[p].score, 0);
  return { total, pillars };
}

export async function storeTrustSnapshot(providerId: string, score: TrustScore): Promise<void> {
  await db
    .collection("providers")
    .doc(providerId)
    .set(
      {
        trustScore: score.total,
        trustPillars: Object.fromEntries(PILLARS.map((p) => [p, score.pillars[p].score])),
        trustScoredAt: Date.now(),
      },
      { merge: true }
    );
}

// Loads everything the score needs for one provider, computes it and stores
// the snapshot (best effort).
export async function scoreProvider(provider: Provider): Promise<TrustScore> {
  const [{ listLeadsByProvider }, { listPublished }, { listLiveJobs }] = await Promise.all([
    import("@/lib/leads"),
    import("@/lib/articles"),
    import("@/lib/jobs"),
  ]);
  const [leads, articles, jobs] = await Promise.all([
    listLeadsByProvider(provider.id),
    listPublished().then((all) => all.filter((a) => a.providerId === provider.id)),
    listLiveJobs().then((all) => all.filter((j) => j.providerId === provider.id)),
  ]);
  const score = computeTrustScore(provider, { leads, articles, jobs });
  if (score.total !== provider.trustScore) {
    void storeTrustSnapshot(provider.id, score).catch((e) => console.error("trust snapshot failed", e));
  }
  return score;
}
