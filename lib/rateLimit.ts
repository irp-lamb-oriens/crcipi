import "server-only";

import { createHash } from "crypto";
import { db } from "@/lib/firebaseAdmin";

// ============================================================
// Firestore-backed rate limiter with exponential backoff.
//
// Applied to the auth endpoints (request-code / verify-code) keyed by
// client IP address. State lives in Firestore so it is shared across
// serverless instances and can be fetched directly:
//
//   auth/rateLimits/entries/{keyHash}
//     -> { key, count, windowStart, backoffUntil, updatedAt }
//
// Backoff grows exponentially (base * 2^(excess-1)) once the per-window
// limit is exceeded. An entry that has been idle for more than a day is
// reset on the next request, so a blocked address is not punished forever.
//
// The limiter fails open on storage errors: a Firestore outage must never
// lock out a legitimate admin.
// ============================================================

const DAY_MS = 24 * 60 * 60 * 1000;

export interface RateLimitOptions {
  /** Maximum allowed requests per window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Base backoff duration in milliseconds (doubles per repeated excess). */
  baseBackoffMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  /** Seconds the caller must wait before retrying (only when !ok). */
  retryAfterSeconds?: number;
}

export interface RateLimitEntry {
  key: string;
  count: number;
  windowStart: number;
  backoffUntil: number;
  updatedAt: number;
}

function keyHash(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function entriesCol() {
  return db.collection("auth").doc("rateLimits").collection("entries");
}

/**
 * Applies a rate limit to `key` (typically a client IP address).
 *
 * Returns `{ ok: false, retryAfterSeconds }` when the request should be
 * rejected with HTTP 429. Fails open on storage errors.
 */
export async function rateLimit(
  key: string,
  opts: RateLimitOptions
): Promise<RateLimitResult> {
  const ref = entriesCol().doc(keyHash(key));
  const now = Date.now();

  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? (snap.data() as RateLimitEntry) : null;

      // Reset an entry that has been idle for more than a day. This is the
      // "reset when the address waits beyond a day" rule: a blocked address
      // gets a clean slate after 24 hours of inactivity.
      if (data && now - (data.updatedAt ?? data.windowStart ?? 0) > DAY_MS) {
        tx.set(ref, {
          key,
          count: 0,
          windowStart: now,
          backoffUntil: 0,
          updatedAt: now,
        });
        return { ok: true as const };
      }

      // Still inside an active backoff window: reject.
      if (data && data.backoffUntil > now) {
        return {
          ok: false as const,
          retryAfterSeconds: Math.ceil((data.backoffUntil - now) / 1000),
        };
      }

      // Start a fresh window if the previous one expired.
      const inWindow = data ? now - data.windowStart < opts.windowMs : false;
      const windowStart = inWindow ? data!.windowStart : now;
      const count = inWindow ? data!.count : 0;

      const nextCount = count + 1;
      if (nextCount > opts.max) {
        const excess = nextCount - opts.max;
        const backoffMs = opts.baseBackoffMs * Math.pow(2, excess - 1);
        const backoffUntil = now + backoffMs;
        tx.set(ref, {
          key,
          count: nextCount,
          windowStart,
          backoffUntil,
          updatedAt: now,
        });
        return {
          ok: false as const,
          retryAfterSeconds: Math.ceil(backoffMs / 1000),
        };
      }

      tx.set(ref, {
        key,
        count: nextCount,
        windowStart,
        backoffUntil: 0,
        updatedAt: now,
      });
      return { ok: true as const };
    });
  } catch {
    // Fail open: never block a request because the rate-limit store is down.
    return { ok: true };
  }
}

/** Fetches a rate-limit entry directly (for inspection / debugging). */
export async function getRateLimitEntry(
  key: string
): Promise<RateLimitEntry | null> {
  try {
    const snap = await entriesCol().doc(keyHash(key)).get();
    return snap.exists ? (snap.data() as RateLimitEntry) : null;
  } catch {
    return null;
  }
}

/** Extracts the client IP from a request, best-effort. */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}