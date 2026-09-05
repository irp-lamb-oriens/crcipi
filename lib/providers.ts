import "server-only";

import { db } from "@/lib/firebaseAdmin";
import {
  PROVIDER_CATEGORIES,
  type ProviderCategory,
} from "@/lib/providerCategories";

export { PROVIDER_CATEGORIES, PROVIDER_CATEGORY_LABELS } from "@/lib/providerCategories";
export type { ProviderCategory } from "@/lib/providerCategories";

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
  const logoUrl = normalizeUrl(String(body.logoUrl ?? "").trim().slice(0, 500));
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
  if (logoUrl && !/^https?:\/\/.+/.test(logoUrl)) {
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

export async function deleteProvider(id: string): Promise<void> {
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