import "server-only";

import { createHash, randomInt, randomBytes } from "crypto";
import { db } from "@/lib/firebaseAdmin";

// ============================================================
// Verified reviews for member directory providers.
//
// A reviewer must prove ownership of an email address before they can post.
// The flow is:
//   1. POST review/request-code -> emails a 6-digit code.
//   2. POST review/verify-code  -> validates the code and returns a token.
//   3. POST review/submit       -> writes the review under the token.
//
// Deduplication by normalized email: `name+suffix@domain` is treated as the
// same person as `name@domain`, so a reviewer cannot bypass the "already
// reviewed" gate with a plus-alias. The review document id is derived from
// (providerId, normalizedEmail), which makes duplicate detection a single
// point-read rather than a query.
//
// Aggregate is maintained incrementally (ratingsCount / ratingsSum on the
// provider doc) inside the write transaction, so the average is always cheap
// to read and never recomputed from a full scan.
// ============================================================

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const TOKEN_TTL_MS = 30 * 60 * 1000;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

// Strip the Gmail-style plus alias and fold case so reviews are keyed on the
// "naked" email, defeating the common re-review trick.
export function normalizeReviewerEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) return trimmed;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at);
  const plus = local.indexOf("+");
  const naked = plus > 0 ? local.slice(0, plus) : local;
  return `${naked}${domain}`;
}

export interface ReviewerIdentity {
  name: string;
  email: string; // normalized
}

export interface ReviewDraft {
  rating: number;
  comment?: string;
}

export interface VerifiedRating {
  id: string;
  rating: number;
  reviewerName: string;
  reviewerEmail: string;
  comment?: string;
  approved: boolean;
  createdAt: number;
}

function providersCol() {
  return db.collection("providers");
}

function ratingsCol(providerId: string) {
  return providersCol().doc(providerId).collection("ratings");
}

function reviewCodeDoc(providerId: string, email: string) {
  return providersCol()
    .doc(providerId)
    .collection("reviewCodes")
    .doc(sha256(normalizeReviewerEmail(email)));
}

function ratingDocId(providerId: string, email: string) {
  return sha256(`${providerId}:${normalizeReviewerEmail(email)}`);
}

// ---------------------------------------------------------------------------
// Codes
// ---------------------------------------------------------------------------

export async function createReviewCode(
  providerId: string,
  email: string
): Promise<string> {
  const code = String(randomInt(0, 1000000)).padStart(6, "0");
  await reviewCodeDoc(providerId, email).set({
    codeHash: sha256(code),
    attempts: 0,
    verified: false,
    verifiedToken: null,
    expiresAt: Date.now() + CODE_TTL_MS,
    createdAt: Date.now(),
  });
  return code;
}

export type CodeVerifyResult =
  | { ok: true; token: string }
  | { ok: false; error: "invalid_code" | "expired" };

export async function verifyReviewCode(
  providerId: string,
  email: string,
  code: string
): Promise<CodeVerifyResult> {
  const ref = reviewCodeDoc(providerId, email);

  try {
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return { ok: false as const, error: "invalid_code" as const };

      const data = snap.data() as {
        codeHash?: string;
        attempts?: number;
        expiresAt?: number;
      };

      if ((data.expiresAt ?? 0) < Date.now()) {
        return { ok: false as const, error: "expired" as const };
      }
      if ((data.attempts ?? 0) >= MAX_ATTEMPTS || data.codeHash !== sha256(code)) {
        tx.update(ref, { attempts: (data.attempts ?? 0) + 1 });
        return { ok: false as const, error: "invalid_code" as const };
      }

      const token = randomBytes(24).toString("hex");
      tx.update(ref, {
        verified: true,
        verifiedToken: token,
        tokenExpiresAt: Date.now() + TOKEN_TTL_MS,
      });
      return { ok: true as const, token };
    });

    return result;
  } catch {
    return { ok: false, error: "invalid_code" };
  }
}

// ---------------------------------------------------------------------------
// Existing review (used to power the "you already reviewed this" step)
// ---------------------------------------------------------------------------

export async function getExistingReview(
  providerId: string,
  email: string
): Promise<VerifiedRating | null> {
  const ref = ratingsCol(providerId).doc(ratingDocId(providerId, email));
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data() as Record<string, unknown>;
  return {
    id: snap.id,
    rating: Number(data.rating ?? 0),
    reviewerName: String(data.reviewerName ?? ""),
    reviewerEmail: normalizeReviewerEmail(email),
    comment: data.comment ? String(data.comment) : undefined,
    approved: data.approved !== false,
    createdAt: Number(data.createdAt ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Submit / update
// ---------------------------------------------------------------------------

export type ReviewSubmitResult =
  | { ok: true; rating: VerifiedRating; alreadyReviewed: boolean; count: number; sum: number }
  | { ok: false; error: "invalid_token" | "invalid_rating" | "not_found" };

export async function submitReview(
  providerId: string,
  input: ReviewerIdentity & { token: string } & ReviewDraft
): Promise<ReviewSubmitResult> {
  const email = normalizeReviewerEmail(input.email);
  const tokenDoc = reviewCodeDoc(providerId, email);

  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return { ok: false, error: "invalid_rating" };
  }
  const comment = (input.comment ?? "").trim().slice(0, 2000);
  const name = input.name.trim().slice(0, 120);
  if (!name) {
    return { ok: false, error: "invalid_token" };
  }

  try {
    const result = await db.runTransaction(async (tx) => {
      const codeSnap = await tx.get(tokenDoc);
      if (!codeSnap.exists) return { ok: false as const, error: "invalid_token" as const };
      const codeData = codeSnap.data() as {
        verified?: boolean;
        verifiedToken?: string | null;
        tokenExpiresAt?: number;
      };
      if (
        codeData.verified !== true ||
        codeData.verifiedToken !== input.token ||
        (codeData.tokenExpiresAt ?? 0) < Date.now()
      ) {
        return { ok: false as const, error: "invalid_token" as const };
      }

      // One use only.
      tx.update(tokenDoc, { verified: false, verifiedToken: null });

      const providerRef = providersCol().doc(providerId);
      const providerSnap = await tx.get(providerRef);
      if (!providerSnap.exists) return { ok: false as const, error: "not_found" as const };
      const providerData = (providerSnap.data() ?? {}) as {
        approved?: boolean;
        ratingsCount?: number;
        ratingsSum?: number;
      };
      if (providerData.approved === false) {
        return { ok: false as const, error: "not_found" as const };
      }

      const ratingRef = ratingsCol(providerId).doc(ratingDocId(providerId, email));
      const ratingSnap = await tx.get(ratingRef);
      const now = Date.now();
      let alreadyReviewed = false;
      let finalCount = Number(providerData.ratingsCount ?? 0);
      let finalSum = Number(providerData.ratingsSum ?? 0);

      if (ratingSnap.exists) {
        alreadyReviewed = true;
        const old = ratingSnap.data() as { rating?: number };
        const oldRating = Number(old.rating ?? 0);
        const delta = input.rating - oldRating;
        tx.set(
          ratingRef,
          {
            rating: input.rating,
            reviewerName: name,
            reviewerEmail: email,
            comment: comment || null,
            approved: true,
            updatedAt: now,
          },
          { merge: true }
        );
        if (delta !== 0) {
          finalSum += delta;
          tx.set(providerRef, { ratingsSum: finalSum }, { merge: true });
        }
      } else {
        tx.set(ratingRef, {
          rating: input.rating,
          reviewerName: name,
          reviewerEmail: email,
          comment: comment || null,
          approved: true,
          createdAt: now,
        });
        finalCount += 1;
        finalSum += input.rating;
        tx.set(
          providerRef,
          { ratingsCount: finalCount, ratingsSum: finalSum },
          { merge: true }
        );
      }

      return {
        ok: true as const,
        rating: {
          id: ratingRef.id,
          rating: input.rating,
          reviewerName: name,
          reviewerEmail: email,
          comment: comment || undefined,
          approved: true,
          createdAt: ratingSnap.exists ? Number(ratingSnap.data()?.createdAt ?? now) : now,
        },
        alreadyReviewed,
        count: finalCount,
        sum: finalSum,
      };
    });

    if (result.ok) {
      // Save the verified email to the platform's newsletter/email ledger
      // regardless of whether they later opt into marketing. Best effort: a
      // capture failure must not fail the review.
      void captureReviewerEmail(email).catch((error) => {
        console.error("Failed to capture reviewer email:", error);
      });
    }

    return result;
  } catch {
    return { ok: false, error: "invalid_token" };
  }
}

// ---------------------------------------------------------------------------
// Newsletter
// ---------------------------------------------------------------------------

export async function captureReviewerEmail(email: string): Promise<void> {
  const normalized = normalizeReviewerEmail(email);
  // Capture only records the email in the platform ledger. The `subscribed`
  // flag is intentionally left unset here so a reviewer who has not made a
  // choice is distinct from one who explicitly declined (false) or opted in
  // (true). Using `merge` also means re-capturing never downgrades an existing
  // opt-in.
  await db
    .collection("newsletter")
    .doc(sha256(normalized))
    .set(
      { email: normalized, source: "review", capturedAt: Date.now() },
      { merge: true }
    );
}

export async function subscribeNewsletter(
  email: string,
  source = "review"
): Promise<void> {
  const normalized = normalizeReviewerEmail(email);
  await db
    .collection("newsletter")
    .doc(sha256(normalized))
    .set(
      {
        email: normalized,
        source,
        subscribed: true,
        subscribedAt: Date.now(),
      },
      { merge: true }
    );
}
