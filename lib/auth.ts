import "server-only";

import { createHash, randomInt, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/firebaseAdmin";

// ============================================================
// CMS Auth: passwordless email-code (magic code) authentication.
//
// Flow:
//   1. Admin enters their email into the login page.
//   2. POST /api/auth/request-code sends a 6-digit code via SMTP.
//   3. Admin enters the code; POST /api/auth/verify-code validates it
//      and sets a session cookie.
//   4. The session cookie is checked on every admin API request.
//
// Firestore structure:
//   auth/adminEmails/{emailKey}     -> { email }
//   auth/loginCodes/{codeHash}      -> { email, expiresAt, attempts }
//   auth/sessions/{sessionToken}    -> { email, expiresAt }
//
// Normalization: emails are lowercased and trimmed. Login codes are hashed
// with SHA-256 before storage so a raw readable code never lives in the DB.
// ============================================================

export const SESSION_COOKIE = "crcipi_cms_session";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_ATTEMPTS = 5;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function emailKey(email: string): string {
  return sha256(normalizeEmail(email));
}

function codeHash(email: string, code: string): string {
  return sha256(`${normalizeEmail(email)}:${code}`);
}

function adminEmailsCol() {
  return db.collection("auth").doc("adminEmails").collection("emails");
}

function loginCodesCol() {
  return db.collection("auth").doc("loginCodes").collection("codes");
}

function sessionsCol() {
  return db.collection("auth").doc("sessions").collection("tokens");
}

// ---------------------------------------------------------------------------
// Admin email allowlist
// ---------------------------------------------------------------------------

export async function isAdminEmail(email: string): Promise<boolean> {
  try {
    const snap = await adminEmailsCol().doc(emailKey(email)).get();
    return snap.exists;
  } catch {
    return false;
  }
}

export async function listAdminEmails(): Promise<string[]> {
  const snap = await adminEmailsCol().orderBy("email").get();
  return snap.docs.map((doc) => doc.data().email as string);
}

// Add an admin email to the allowlist (used by seed scripts).
export async function addAdminEmail(email: string): Promise<void> {
  await adminEmailsCol().doc(emailKey(email)).set({
    email: normalizeEmail(email),
    createdAt: Date.now(),
  });
}

// ---------------------------------------------------------------------------
// Login codes
// ---------------------------------------------------------------------------

export async function createLoginCode(email: string): Promise<string> {
  const code = String(randomInt(0, 1000000)).padStart(6, "0");
  await loginCodesCol().doc(codeHash(email, code)).set({
    email: normalizeEmail(email),
    expiresAt: Date.now() + CODE_TTL_MS,
    attempts: 0,
    createdAt: Date.now(),
  });
  return code;
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; error: "invalid_code" | "expired" | "too_many_attempts" };

export async function verifyLoginCode(
  email: string,
  code: string
): Promise<VerifyResult> {
  const normalized = normalizeEmail(email);
  const ref = loginCodesCol().doc(codeHash(normalized, code));

  try {
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        return { ok: false as const, error: "invalid_code" as const };
      }

      const data = snap.data() as {
        email?: string;
        expiresAt?: number;
        attempts?: number;
      };

      if (data.email !== normalized) {
        return { ok: false as const, error: "invalid_code" as const };
      }

      if ((data.expiresAt ?? 0) < Date.now()) {
        return { ok: false as const, error: "expired" as const };
      }

      if ((data.attempts ?? 0) >= MAX_ATTEMPTS) {
        return { ok: false as const, error: "too_many_attempts" as const };
      }

      // Code is correct: consume it so it cannot be reused.
      await tx.delete(ref);
      return { ok: true as const };
    });

    return result;
  } catch {
    // Storage failure: fail closed.
    return { ok: false, error: "invalid_code" };
  }
}

// Increments the attempt counter after a failed code entry. Callers pass the
// raw code; we look it up by hash and bump attempts if the doc exists.
export async function recordFailedAttempt(email: string, code: string): Promise<void> {
  const ref = loginCodesCol().doc(codeHash(normalizeEmail(email), code));
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      const data = snap.data() as { attempts?: number };
      tx.update(ref, { attempts: (data.attempts ?? 0) + 1 });
    });
  } catch {
    // Best effort.
  }
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export async function createSession(email: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await sessionsCol().doc(token).set({
    email: normalizeEmail(email),
    expiresAt: Date.now() + SESSION_TTL_MS,
    createdAt: Date.now(),
  });
  return token;
}

export async function getSessionEmail(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const snap = await sessionsCol().doc(token).get();
    if (!snap.exists) return null;
    const data = snap.data() as { email?: string; expiresAt?: number };
    if ((data.expiresAt ?? 0) < Date.now()) {
      await sessionsCol().doc(token).delete().catch(() => {});
      return null;
    }
    return data.email ?? null;
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<boolean> {
  const email = await getSessionEmail();
  if (!email) return false;
  return isAdminEmail(email);
}

export async function deleteSession(token: string): Promise<void> {
  await sessionsCol().doc(token).delete();
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

// Constant-time compare helper (used where timing safety matters). Kept for
// completeness; code verification relies on the hashed document lookup above.
export function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}