import "server-only";

import { createHash, randomInt, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/firebaseAdmin";
import {
  ADMIN_PERMISSIONS,
  type AdminPermission,
  type UserRole,
  type UserStatus,
} from "@/lib/permissions";

// ============================================================
// Unified authentication and access control.
//
// Two roles share one user model:
//   admin   - CMS + provider directory + user/permission management
//   member  - read the public directory, own and edit their businesses
//
// Login is passwordless: email magic code. Signup creates a user; login does
// not create one.
//
// Firestore structure:
//   users/{userId}                          -> { email, name, role,
//                                               permissions, status,
//                                               createdAt, lastLoginAt }
//   auth/loginCodes/codes/{codeHash}        -> { email, expiresAt, attempts }
//   auth/sessions/tokens/{sessionToken}     -> { userId, email, role, expiresAt }
//
// Business ownership is recorded on each provider (provider.ownerId) rather
// than duplicated here, so a member's "accesses" are always derived from the
// providers collection and can never drift out of sync.
//
// userId is the SHA-256 of the normalized email, matching the legacy admin
// allowlist key scheme so an account is unique and signup is idempotent.
// Login codes are hashed with SHA-256 before storage; raw codes never persist.
// ============================================================

export const SESSION_COOKIE = "crcipi_cms_session";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_ATTEMPTS = 5;

export { ADMIN_PERMISSIONS };
export type { AdminPermission, UserRole, UserStatus };

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: AdminPermission[];
  status: UserStatus;
  createdAt: number;
  lastLoginAt?: number;
}

// A permission-reduced view of the signed-in user, safe to return to the client.
// Business ownership lives on each provider document (provider.ownerId), not here.
export interface SessionUser {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: AdminPermission[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function emailKey(email: string): string {
  return sha256(normalizeEmail(email));
}

function codeHash(email: string, code: string): string {
  return sha256(`${normalizeEmail(email)}:${code}`);
}

function usersCol() {
  return db.collection("users");
}

function legacyAdminEmailsCol() {
  return db.collection("auth").doc("adminEmails").collection("emails");
}

function loginCodesCol() {
  return db.collection("auth").doc("loginCodes").collection("codes");
}

function sessionsCol() {
  return db.collection("auth").doc("sessions").collection("tokens");
}

function isAdminPermission(value: unknown): value is AdminPermission {
  return (ADMIN_PERMISSIONS as readonly unknown[]).includes(value);
}

function toUser(id: string, data: Record<string, unknown>): User {
  const rawPermissions = Array.isArray(data.permissions) ? data.permissions : [];
  const permissions = rawPermissions.filter(isAdminPermission);

  return {
    id,
    email: String(data.email ?? ""),
    name: String(data.name ?? ""),
    role: data.role === "member" ? "member" : "admin",
    permissions,
    status: data.status === "suspended" ? "suspended" : "active",
    createdAt: Number(data.createdAt ?? 0),
    lastLoginAt: data.lastLoginAt ? Number(data.lastLoginAt) : undefined,
  };
}

function toSessionUser(user: User): SessionUser {
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: user.permissions,
  };
}

// A legacy admin account synthesized from the pre-users allowlist. Admin-only,
// full permissions.
function legacyAdminFromEmail(email: string): User {
  return {
    id: emailKey(email),
    email: normalizeEmail(email),
    name: "",
    role: "admin",
    permissions: [...ADMIN_PERMISSIONS],
    status: "active",
    createdAt: 0,
  };
}

// ---------------------------------------------------------------------------
// User reads / writes
// ---------------------------------------------------------------------------

export async function getUserById(id: string): Promise<User | null> {
  const snap = await usersCol().doc(id).get();
  if (!snap.exists) return null;
  return toUser(id, (snap.data() ?? {}) as Record<string, unknown>);
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const user = await getUserById(emailKey(email));
  if (user) return user;

  // Backward compatibility: before the unified model, admins lived only in
  // the legacy allowlist. Treat a still-allowlisted address as an admin until
  // it is migrated into `users` by the seed script.
  try {
    const snap = await legacyAdminEmailsCol().doc(emailKey(email)).get();
    if (snap.exists) return legacyAdminFromEmail(email);
  } catch {
    // Fall through: a legacy lookup failure should not block user resolution.
  }
  return null;
}

export interface CreateUserInput {
  email: string;
  name: string;
  role?: UserRole;
  permissions?: AdminPermission[];
  status?: UserStatus;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const email = normalizeEmail(input.email);
  const id = emailKey(email);
  const now = Date.now();

  const user: User = {
    id,
    email,
    name: input.name.trim().slice(0, 120),
    role: input.role === "member" ? "member" : "admin",
    permissions: (input.permissions ?? []).filter(isAdminPermission),
    status: input.status === "suspended" ? "suspended" : "active",
    createdAt: now,
  };

  const data: Record<string, unknown> = {
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: user.permissions,
    status: user.status,
    createdAt: user.createdAt,
  };

  await usersCol().doc(id).set(data, { merge: true });
  return user;
}

export async function listUsers(): Promise<User[]> {
  const snap = await usersCol().orderBy("email", "asc").get();
  return snap.docs.map((doc) =>
    toUser(doc.id, (doc.data() ?? {}) as Record<string, unknown>)
  );
}

export async function updateUser(
  id: string,
  patch: Partial<Omit<User, "id" | "email" | "createdAt">>
): Promise<void> {
  const clean: Record<string, unknown> = {};
  if (patch.name !== undefined) clean.name = patch.name;
  if (patch.role !== undefined) clean.role = patch.role;
  if (patch.permissions !== undefined) {
    clean.permissions = patch.permissions.filter(isAdminPermission);
  }
  if (patch.status !== undefined) clean.status = patch.status;
  if (patch.lastLoginAt !== undefined) clean.lastLoginAt = patch.lastLoginAt;
  await usersCol().doc(id).set(clean, { merge: true });
}

// Admin email allowlist compatibility. Prefer the unified `users` model; these
// two helpers remain so seed tooling keeps working during the transition.
export async function isAdminEmail(email: string): Promise<boolean> {
  const user = await getUserByEmail(email);
  return user?.role === "admin";
}

export async function listAdminEmails(): Promise<string[]> {
  const users = await listUsers();
  return users.filter((user) => user.role === "admin").map((user) => user.email);
}

export async function addAdminEmail(email: string): Promise<void> {
  await createUser({
    email,
    name: "",
    role: "admin",
    permissions: [...ADMIN_PERMISSIONS],
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

      await tx.delete(ref);
      return { ok: true as const };
    });

    return result;
  } catch {
    return { ok: false, error: "invalid_code" };
  }
}

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

export async function createSession(user: {
  id: string;
  email: string;
  role: UserRole;
}): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await sessionsCol().doc(token).set({
    userId: user.id,
    email: normalizeEmail(user.email),
    role: user.role,
    expiresAt: Date.now() + SESSION_TTL_MS,
    createdAt: Date.now(),
  });
  return token;
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

// Returns the signed-in user with fresh permissions from the users collection.
// Falls back to a legacy email-only session if present.
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const snap = await sessionsCol().doc(token).get();
    if (!snap.exists) return null;

    const data = snap.data() as {
      userId?: string;
      email?: string;
      role?: string;
      expiresAt?: number;
    };

    if ((data.expiresAt ?? 0) < Date.now()) {
      await sessionsCol().doc(token).delete().catch(() => {});
      return null;
    }

    // Resolve by email with a legacy-allowlist fallback, so sessions created
    // before the unified users model (and admins still only in the old
    // allowlist) keep working instead of resolving as anonymous. userId is
    // only a last resort for sessions that somehow lack an email.
    const user = data.email
      ? await getUserByEmail(data.email)
      : data.userId
        ? await getUserById(data.userId)
        : null;
    if (!user || user.status !== "active") return null;

    return toSessionUser(user);
  } catch {
    return null;
  }
}

// Deprecated convenience: returns only the session email. Kept so existing
// callers keep working during the transition.
export async function getSessionEmail(): Promise<string | null> {
  const user = await getSessionUser();
  return user?.email ?? null;
}

// ---------------------------------------------------------------------------
// Access-control guards
// ---------------------------------------------------------------------------

export function hasPermission(
  user: Pick<SessionUser, "role" | "permissions"> | null,
  permission: AdminPermission
): boolean {
  return !!user && user.role === "admin" && user.permissions.includes(permission);
}

export async function requireSessionUser(): Promise<SessionUser | null> {
  return getSessionUser();
}

export async function requireMember(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  return user?.role === "member" ? user : null;
}

// True only for an active admin session.
export async function requireAdmin(): Promise<boolean> {
  const user = await getSessionUser();
  return user?.role === "admin";
}

// True when the session is an admin holding the given permission.
export async function requirePermission(
  permission: AdminPermission
): Promise<boolean> {
  const user = await getSessionUser();
  return hasPermission(user, permission);
}

// Constant-time compare helper (used where timing safety matters). Kept for
// completeness; code verification relies on the hashed document lookup above.
export function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}