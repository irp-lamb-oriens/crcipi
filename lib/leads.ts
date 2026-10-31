import "server-only";

import { db } from "@/lib/firebaseAdmin";

// ============================================================
// Contactos: consultation requests from investors to member providers.
//
// This is the loop the platform exists to run:
//   investor finds a provider -> requests contact -> member responds ->
//   member marks the lead won -> the client is asked for a verified review.
//
// Firestore structure:
//   leads/{leadId}
//     -> { providerId, providerName, ownerId, name, email, country, need,
//          timeline, message, locale, source, status, createdAt,
//          firstResponseAt, closedAt, lostReason, reviewRequestedAt }
//
// ownerId is denormalised from the provider at creation time so the member
// inbox is one single-field query. Response time (createdAt ->
// firstResponseAt) is summarised on the provider doc as
// responseHoursMedian, so the public profile never scans leads.
// ============================================================

export const LEAD_STATUSES = ["new", "talking", "won", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_NEEDS = [
  "residency",
  "company",
  "real-estate",
  "banking",
  "tax",
  "insurance",
  "health",
  "relocation",
  "other",
] as const;
export type LeadNeed = (typeof LEAD_NEEDS)[number];

export const LEAD_TIMELINES = ["now", "3-months", "6-months", "exploring"] as const;
export type LeadTimeline = (typeof LEAD_TIMELINES)[number];

export const LOST_REASONS = ["no-reply", "price", "not-a-fit", "spam", "other"] as const;
export type LostReason = (typeof LOST_REASONS)[number];

export interface Lead {
  id: string;
  providerId: string;
  providerName: string;
  ownerId: string | null;
  name: string;
  email: string;
  country: string;
  need: LeadNeed;
  timeline: LeadTimeline;
  message: string;
  locale: "en" | "es";
  source: "profile" | "directory";
  status: LeadStatus;
  createdAt: number;
  firstResponseAt: number | null;
  closedAt: number | null;
  lostReason: LostReason | null;
  reviewRequestedAt: number | null;
}

const HOUR_MS = 60 * 60 * 1000;

function leadsCol() {
  return db.collection("leads");
}

function pick<T extends string>(list: readonly T[], value: unknown, fallback: T): T {
  return (list as readonly unknown[]).includes(value) ? (value as T) : fallback;
}

function toLead(id: string, d: Record<string, unknown>): Lead {
  const num = (v: unknown) => (typeof v === "number" ? v : null);
  return {
    id,
    providerId: String(d.providerId ?? ""),
    providerName: String(d.providerName ?? ""),
    ownerId: d.ownerId ? String(d.ownerId) : null,
    name: String(d.name ?? ""),
    email: String(d.email ?? ""),
    country: String(d.country ?? ""),
    need: pick(LEAD_NEEDS, d.need, "other"),
    timeline: pick(LEAD_TIMELINES, d.timeline, "exploring"),
    message: String(d.message ?? ""),
    locale: d.locale === "es" ? "es" : "en",
    source: d.source === "directory" ? "directory" : "profile",
    status: pick(LEAD_STATUSES, d.status, "new"),
    createdAt: Number(d.createdAt ?? 0),
    firstResponseAt: num(d.firstResponseAt),
    closedAt: num(d.closedAt),
    lostReason: d.lostReason ? pick(LOST_REASONS, d.lostReason, "other") : null,
    reviewRequestedAt: num(d.reviewRequestedAt),
  };
}

// ---------------------------------------------------------------------------
// Validation (public form)
// ---------------------------------------------------------------------------

export interface LeadInput {
  name: string;
  email: string;
  country: string;
  need: LeadNeed;
  timeline: LeadTimeline;
  message: string;
  locale: "en" | "es";
  source: "profile" | "directory";
}

export type LeadValidation =
  | { ok: true; data: LeadInput }
  | { ok: false; errors: Record<string, string> };

export function validateLeadInput(raw: unknown): LeadValidation {
  const body = (raw ?? {}) as Record<string, unknown>;
  const name = String(body.name ?? "").trim().slice(0, 120);
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 254);
  const country = String(body.country ?? "").trim().slice(0, 80);
  const message = String(body.message ?? "").trim().slice(0, 3000);

  const errors: Record<string, string> = {};
  if (!name) errors.name = "required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "invalid";
  if (!(LEAD_NEEDS as readonly unknown[]).includes(body.need)) errors.need = "invalid";
  if (!(LEAD_TIMELINES as readonly unknown[]).includes(body.timeline)) errors.timeline = "invalid";
  if (message.length < 10) errors.message = "too_short";
  if (body.consent !== true && body.consent !== "true") errors.consent = "required";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      name,
      email,
      country,
      need: body.need as LeadNeed,
      timeline: body.timeline as LeadTimeline,
      message,
      locale: body.locale === "es" ? "es" : "en",
      source: body.source === "directory" ? "directory" : "profile",
    },
  };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getLead(id: string): Promise<Lead | null> {
  const snap = await leadsCol().doc(id).get();
  if (!snap.exists) return null;
  return toLead(snap.id, (snap.data() ?? {}) as Record<string, unknown>);
}

export async function listLeadsByOwner(ownerId: string): Promise<Lead[]> {
  const snap = await leadsCol().where("ownerId", "==", ownerId).get();
  return snap.docs
    .map((doc) => toLead(doc.id, doc.data() as Record<string, unknown>))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function listLeadsByProvider(providerId: string): Promise<Lead[]> {
  const snap = await leadsCol().where("providerId", "==", providerId).get();
  return snap.docs.map((doc) => toLead(doc.id, doc.data() as Record<string, unknown>));
}

export async function listAllLeads(since = 0): Promise<Lead[]> {
  const snap = await leadsCol().where("createdAt", ">=", since).get();
  return snap.docs.map((doc) => toLead(doc.id, doc.data() as Record<string, unknown>));
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function createLead(
  input: LeadInput,
  provider: { id: string; name: string; ownerId: string | null }
): Promise<Lead> {
  const ref = leadsCol().doc();
  const lead: Omit<Lead, "id"> = {
    ...input,
    providerId: provider.id,
    providerName: provider.name,
    ownerId: provider.ownerId,
    status: "new",
    createdAt: Date.now(),
    firstResponseAt: null,
    closedAt: null,
    lostReason: null,
    reviewRequestedAt: null,
  };
  await ref.set(lead);
  return { id: ref.id, ...lead };
}

export type LeadAction =
  | { type: "responded" }
  | { type: "won" }
  | { type: "lost"; reason: LostReason }
  | { type: "reopen" };

export function parseLeadAction(raw: unknown): LeadAction | null {
  const body = (raw ?? {}) as Record<string, unknown>;
  switch (body.action) {
    case "responded":
    case "won":
    case "reopen":
      return { type: body.action };
    case "lost":
      return { type: "lost", reason: pick(LOST_REASONS, body.reason, "other") };
    default:
      return null;
  }
}

// Applies a member action and returns the updated lead plus what changed, so
// the route can fire the side effects (stats, review request) exactly once.
export async function applyLeadAction(
  lead: Lead,
  action: LeadAction,
  now = Date.now()
): Promise<{ lead: Lead; firstResponse: boolean; becameWon: boolean }> {
  const patch: Partial<Lead> = {};
  const firstResponse = lead.firstResponseAt === null && action.type !== "reopen";
  // Any member action other than reopening counts as having responded:
  // closing a lead without replying still stops the clock.
  if (firstResponse) patch.firstResponseAt = now;

  if (action.type === "responded") {
    if (lead.status === "new") patch.status = "talking";
  } else if (action.type === "won") {
    patch.status = "won";
    patch.closedAt = now;
    patch.lostReason = null;
  } else if (action.type === "lost") {
    patch.status = "lost";
    patch.closedAt = now;
    patch.lostReason = action.reason;
  } else {
    patch.status = "talking";
    patch.closedAt = null;
    patch.lostReason = null;
  }

  await leadsCol().doc(lead.id).set(patch, { merge: true });
  return {
    lead: { ...lead, ...patch },
    firstResponse,
    becameWon: action.type === "won" && lead.status !== "won",
  };
}

export async function markReviewRequested(id: string, now = Date.now()): Promise<void> {
  await leadsCol().doc(id).set({ reviewRequestedAt: now }, { merge: true });
}

// ---------------------------------------------------------------------------
// Responsiveness
// ---------------------------------------------------------------------------

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function responseHours(lead: Lead): number | null {
  if (lead.firstResponseAt === null) return null;
  return Math.max(0, (lead.firstResponseAt - lead.createdAt) / HOUR_MS);
}

// Median first-response time over the provider's 20 most recent answered
// leads, stored on the provider for the public profile. Returns the value.
export async function refreshProviderResponseTime(providerId: string): Promise<number | null> {
  const leads = await listLeadsByProvider(providerId);
  const hours = leads
    .filter((lead) => lead.firstResponseAt !== null)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 20)
    .map((lead) => responseHours(lead) as number);
  const value = median(hours);
  await db
    .collection("providers")
    .doc(providerId)
    .set(
      {
        responseHoursMedian: value === null ? null : Math.round(value * 10) / 10,
        responseSample: hours.length,
      },
      { merge: true }
    );
  return value;
}

// A lead that has waited longer than this without a reply is overdue: the
// inbox flags it and it counts against the provider's reply time.
export const RESPONSE_TARGET_HOURS = 24;

export function hoursWaiting(lead: Lead, now = Date.now()): number {
  return (now - lead.createdAt) / HOUR_MS;
}
