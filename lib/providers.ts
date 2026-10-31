import "server-only";

import { createHash } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";
import {
  PROVIDER_CATEGORIES,
  type ProviderCategory,
} from "@/lib/providerCategories";

export { PROVIDER_CATEGORIES, PROVIDER_CATEGORY_LABELS } from "@/lib/providerCategories";
export type { ProviderCategory } from "@/lib/providerCategories";
import { KYC_STATUSES, type KycStatus } from "@/lib/kycOptions";

// ============================================================
// CR-CIPI Member Provider Directory
// ============================================================
//
// Firestore structure:
//   providers/{providerId}
//     -> { name, category, descriptionEn, descriptionEs, website, email,
//          phone, location, logoUrl, featured, approved, memberSince,
//          ratingsCount, ratingsSum }
//   providers/{providerId}/ratings/{ratingId}
//     -> { rating, reviewerName, comment, approved, createdAt }
//
// Ratings are moderated: a new review is stored with `approved: false` and
// only counts toward the provider's aggregate (ratingsCount / ratingsSum)
// once an admin approves it. Rejecting deletes the review.
// ============================================================

export interface Provider {
  id: string;
  name: string;
  category: ProviderCategory;
  descriptionEn: string;
  descriptionEs: string;
  website?: string;
  email?: string;
  phone?: string;
  location?: string;
  logoUrl?: string;
  featured: boolean;
  approved: boolean;
  ownerId: string | null;
  memberSince: number;
  ratingsCount: number;
  ratingsSum: number;
  // Public outcome of the KYC review (details live in lib/kyc.ts).
  verified: boolean;
  kycStatus: KycStatus;
  // Median hours to first reply on Contactos leads (lib/leads.ts); null
  // until the provider has answered at least one.
  responseHoursMedian: number | null;
  responseSample: number;
  // Languages the business serves clients in (ISO 639-1), set at onboarding.
  languages: string[];
  // Last computed trust score (lib/trustScore.ts), for sorting; null until scored.
  trustScore: number | null;
}

export interface ProviderRating {
  id: string;
  rating: number;
  reviewerName: string;
  reviewerEmail?: string;
  comment?: string;
  approved: boolean;
  createdAt: number;
}

export function averageRating(provider: Provider): number | null {
  if (!provider.ratingsCount) return null;
  return Math.round((provider.ratingsSum / provider.ratingsCount) * 10) / 10;
}

function toProvider(id: string, d: Record<string, unknown>): Provider {
  return {
    id,
    name: String(d.name ?? ""),
    category: PROVIDER_CATEGORIES.includes(d.category as ProviderCategory)
      ? (d.category as ProviderCategory)
      : "other",
    descriptionEn: String(d.descriptionEn ?? ""),
    descriptionEs: String(d.descriptionEs ?? ""),
    website: d.website ? String(d.website) : undefined,
    email: d.email ? String(d.email) : undefined,
    phone: d.phone ? String(d.phone) : undefined,
    location: d.location ? String(d.location) : undefined,
    logoUrl: d.logoUrl ? String(d.logoUrl) : undefined,
    featured: d.featured === true,
    approved: d.approved !== false,
    ownerId: d.ownerId ? String(d.ownerId) : null,
    memberSince: Number(d.memberSince ?? 0),
    ratingsCount: Number(d.ratingsCount ?? 0),
    ratingsSum: Number(d.ratingsSum ?? 0),
    verified: d.verified === true,
    kycStatus: (KYC_STATUSES as readonly unknown[]).includes(d.kycStatus)
      ? (d.kycStatus as KycStatus)
      : "none",
    responseHoursMedian:
      typeof d.responseHoursMedian === "number" ? d.responseHoursMedian : null,
    responseSample: Number(d.responseSample ?? 0),
    languages: Array.isArray(d.languages) ? (d.languages as unknown[]).map(String).slice(0, 10) : [],
    trustScore: typeof d.trustScore === "number" ? d.trustScore : null,
  };
}

function toRating(doc: FirebaseFirestore.QueryDocumentSnapshot): ProviderRating {
  const d = (doc.data() ?? {}) as Record<string, unknown>;
  return {
    id: doc.id,
    rating: Number(d.rating ?? 0),
    reviewerName: String(d.reviewerName ?? ""),
    reviewerEmail: d.reviewerEmail ? String(d.reviewerEmail) : undefined,
    comment: d.comment ? String(d.comment) : undefined,
    approved: d.approved !== false,
    createdAt: Number(d.createdAt ?? 0),
  };
}

function providersCol() {
  return db.collection("providers");
}

function ratingsCol(providerId: string) {
  return providersCol().doc(providerId).collection("ratings");
}

// ---------------------------------------------------------------------------
// Public reads
// ---------------------------------------------------------------------------

export async function listProviders(
  options: { approvedOnly?: boolean } = {}
): Promise<Provider[]> {
  // Single-field order avoids requiring a composite index. Approval filtering
  // and featured-first sorting happen in memory (the directory is small).
  const snap = await providersCol().orderBy("name", "asc").get();
  let providers = snap.docs.map((doc) =>
    toProvider(doc.id, (doc.data() ?? {}) as Record<string, unknown>)
  );
  if (options.approvedOnly) {
    providers = providers.filter((provider) => provider.approved);
  }
  providers.sort(
    (a, b) =>
      (b.featured ? 1 : 0) - (a.featured ? 1 : 0) ||
      a.name.localeCompare(b.name)
  );
  return providers;
}

export async function getProvider(id: string): Promise<Provider | null> {
  const snap = await providersCol().doc(id).get();
  if (!snap.exists) return null;
  return toProvider(id, (snap.data() ?? {}) as Record<string, unknown>);
}

// Providers owned by a given member, ordered by name. Ownership lives on the
// provider document (ownerId) so this is always in sync with the latest data.
export async function listProvidersByOwner(ownerId: string): Promise<Provider[]> {
  const snap = await providersCol().where("ownerId", "==", ownerId).get();
  return snap.docs
    .map((doc) => toProvider(doc.id, (doc.data() ?? {}) as Record<string, unknown>))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listRatings(
  providerId: string,
  options: { approvedOnly?: boolean } = {}
): Promise<ProviderRating[]> {
  const snap = await ratingsCol(providerId).orderBy("createdAt", "desc").get();
  let ratings = snap.docs.map(toRating);
  if (options.approvedOnly) {
    ratings = ratings.filter((rating) => rating.approved);
  }
  return ratings;
}

// ---------------------------------------------------------------------------
// Public mutation: submit a rating (pending moderation)
// ---------------------------------------------------------------------------

export interface RatingInput {
  rating: number;
  reviewerName: string;
  comment?: string;
}

export type RatingValidation =
  | { ok: true; data: RatingInput }
  | { ok: false; errors: Record<string, string> };

export function validateRatingInput(raw: unknown): RatingValidation {
  const body = (raw ?? {}) as Record<string, unknown>;
  const rating = Number(body.rating);
  const reviewerName = String(body.reviewerName ?? "").trim().slice(0, 120);
  const comment = String(body.comment ?? "").trim().slice(0, 2000);

  const errors: Record<string, string> = {};
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    errors.rating = "invalid";
  }
  if (!reviewerName) {
    errors.reviewerName = "required";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: { rating, reviewerName, comment: comment || undefined },
  };
}

export async function submitRating(
  providerId: string,
  input: RatingInput
): Promise<ProviderRating> {
  const docRef = ratingsCol(providerId).doc();
  const rating: Omit<ProviderRating, "id"> = {
    rating: input.rating,
    reviewerName: input.reviewerName,
    comment: input.comment,
    approved: false,
    createdAt: Date.now(),
  };
  await docRef.set(rating);
  return { id: docRef.id, ...rating };
}

// ---------------------------------------------------------------------------
// Admin mutations
// ---------------------------------------------------------------------------

export interface ProviderInput {
  name: string;
  category: ProviderCategory;
  descriptionEn: string;
  descriptionEs: string;
  website?: string;
  email?: string;
  phone?: string;
  location?: string;
  logoUrl?: string;
  featured: boolean;
  ownerId?: string | null;
}

export type ProviderValidation =
  | { ok: true; data: ProviderInput }
  | { ok: false; errors: Record<string, string> };

// Files uploaded through /api/member/uploads are served from here.
export function isMediaPath(value: string): boolean {
  return /^\/api\/media\/public\/[A-Za-z0-9/_.-]+$/.test(value) && !value.includes("..");
}

function normalizeUrl(value: string): string {
  if (!value || /^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

export function validateProviderInput(raw: unknown): ProviderValidation {
  const body = (raw ?? {}) as Record<string, unknown>;
  const name = String(body.name ?? "").trim().slice(0, 160);
  const category = body.category as ProviderCategory;
  const descriptionEn = String(body.descriptionEn ?? "").trim().slice(0, 4000);
  const descriptionEs = String(body.descriptionEs ?? "").trim().slice(0, 4000);
  const website = normalizeUrl(String(body.website ?? "").trim().slice(0, 500));
  const email = String(body.email ?? "").trim().slice(0, 254);
  const phone = String(body.phone ?? "").trim().slice(0, 60);
  const location = String(body.location ?? "").trim().slice(0, 160);
  // A logo is either an absolute URL or a file uploaded to our own storage
  // (/api/media/public/...). Relative media paths must not get "https://"
  // glued on, which used to turn them into broken "https:///api/..." links.
  const rawLogo = String(body.logoUrl ?? "").trim().slice(0, 500);
  const logoUrl = isMediaPath(rawLogo) ? rawLogo : normalizeUrl(rawLogo);
  const featured = body.featured === true;

  const errors: Record<string, string> = {};
  if (!name) errors.name = "required";
  if (!PROVIDER_CATEGORIES.includes(category)) errors.category = "invalid";
  if (!descriptionEn) errors.descriptionEn = "required";
  if (!descriptionEs) errors.descriptionEs = "required";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "invalid";
  }
  if (website && !/^https?:\/\/.+/.test(website)) {
    errors.website = "invalid";
  }
  if (logoUrl && !isMediaPath(logoUrl) && !/^https?:\/\/.+/.test(logoUrl)) {
    errors.logoUrl = "invalid";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      name,
      category,
      descriptionEn,
      descriptionEs,
      website: website || undefined,
      email: email || undefined,
      phone: phone || undefined,
      location: location || undefined,
      logoUrl: logoUrl || undefined,
      featured,
    },
  };
}

export async function createProvider(
  input: ProviderInput,
  options: { approved?: boolean; ownerId?: string | null } = {}
): Promise<Provider> {
  const docRef = providersCol().doc();
  const provider: Omit<Provider, "id"> = {
    ...input,
    ownerId: options.ownerId ?? input.ownerId ?? null,
    approved: options.approved ?? true,
    memberSince: Date.now(),
    ratingsCount: 0,
    ratingsSum: 0,
    verified: false,
    kycStatus: "none",
    responseHoursMedian: null,
    responseSample: 0,
    languages: [],
    trustScore: null,
  };
  await docRef.set(provider);
  return { id: docRef.id, ...provider };
}

export async function updateProvider(
  id: string,
  patch: Partial<ProviderInput> & { approved?: boolean; ownerId?: string | null }
): Promise<void> {
  // Strip undefined so Firestore never rejects the write.
  const clean = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined)
  );
  await providersCol().doc(id).set(clean, { merge: true });
}

// Optional listing fields: when an edit leaves one empty it must be removed,
// not silently kept. updateProvider() merges and skips undefined, which is
// right for partial patches but wrong for a full form save.
const OPTIONAL_FIELDS = ["website", "email", "phone", "location", "logoUrl"] as const;

// Saves a complete, validated listing form. Every editable field is written;
// optional ones left empty are deleted. Fields owned by other flows
// (owner, approval, verification, ratings, languages, trust) are untouched.
export async function saveProviderForm(
  id: string,
  input: ProviderInput,
  extra: { approved?: boolean; featured?: boolean } = {}
): Promise<void> {
  const data: Record<string, unknown> = {
    name: input.name,
    category: input.category,
    descriptionEn: input.descriptionEn,
    descriptionEs: input.descriptionEs,
    featured: extra.featured ?? input.featured,
    updatedAt: Date.now(),
  };
  for (const key of OPTIONAL_FIELDS) {
    data[key] = input[key] ? input[key] : FieldValue.delete();
  }
  if (extra.approved !== undefined) data.approved = extra.approved;
  await providersCol().doc(id).set(data, { merge: true });
}

// Same owner, same name (ignoring case, accents and spacing): treated as the
// same business, so a double-click or a re-submit can't create a copy.
export function nameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function nameLockRef(ownerId: string, name: string) {
  const id = createHash("sha256").update(`${ownerId}:${nameKey(name)}`).digest("hex");
  return db.collection("providerNameLocks").doc(id);
}

export type CreateOwnedResult =
  | { created: true; provider: Provider }
  | { created: false; existing: Provider };

// Creates a member's business at most once per (owner, name). The lock doc is
// claimed with create(), which is atomic, so two simultaneous submissions
// cannot both win. A lock that points at a business since deleted, renamed
// or moved to another owner is stale and gets replaced.
export async function createOwnedProvider(
  input: ProviderInput,
  ownerId: string
): Promise<CreateOwnedResult> {
  const lock = nameLockRef(ownerId, input.name);
  const ref = providersCol().doc();
  try {
    await lock.create({ providerId: ref.id, ownerId, createdAt: Date.now() });
  } catch {
    const held = (await lock.get()).data() as { providerId?: string } | undefined;
    const existing = held?.providerId ? await getProvider(held.providerId) : null;
    if (existing && existing.ownerId === ownerId && nameKey(existing.name) === nameKey(input.name)) {
      return { created: false, existing };
    }
    await lock.set({ providerId: ref.id, ownerId, createdAt: Date.now() });
  }
  const provider: Omit<Provider, "id"> = {
    ...input,
    featured: false,
    ownerId,
    approved: true,
    memberSince: Date.now(),
    ratingsCount: 0,
    ratingsSum: 0,
    verified: false,
    kycStatus: "none",
    responseHoursMedian: null,
    responseSample: 0,
    languages: [],
    trustScore: null,
  };
  const clean = Object.fromEntries(Object.entries(provider).filter(([, v]) => v !== undefined));
  await ref.set(clean);
  return { created: true, provider: { id: ref.id, ...provider } };
}

export async function deleteProvider(id: string): Promise<void> {
  // Firestore does not cascade: remove the private KYC record explicitly so
  // no legal data is orphaned after a business is deleted.
  await providersCol().doc(id).collection("private").doc("kyc").delete();
  await providersCol().doc(id).delete();
}

export async function approveRating(
  providerId: string,
  ratingId: string
): Promise<void> {
  const providerRef = providersCol().doc(providerId);
  const ratingRef = ratingsCol(providerId).doc(ratingId);

  await db.runTransaction(async (tx) => {
    const ratingSnap = await tx.get(ratingRef);
    if (!ratingSnap.exists) {
      throw new Error("rating_not_found");
    }
    const rating = ratingSnap.data() as { approved?: boolean; rating?: number };
    if (rating.approved) return; // idempotent

    tx.update(ratingRef, { approved: true });

    const providerSnap = await tx.get(providerRef);
    const current = (providerSnap.data() ?? {}) as {
      ratingsCount?: number;
      ratingsSum?: number;
    };
    const count = Number(current.ratingsCount ?? 0) + 1;
    const sum = Number(current.ratingsSum ?? 0) + Number(rating.rating ?? 0);
    tx.set(providerRef, { ratingsCount: count, ratingsSum: sum }, { merge: true });
  });
}

export async function rejectRating(
  providerId: string,
  ratingId: string
): Promise<void> {
  await ratingsCol(providerId).doc(ratingId).delete();
}