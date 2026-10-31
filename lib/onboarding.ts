import "server-only";

import { db } from "@/lib/firebaseAdmin";
import { legalIdKey } from "@/lib/kyc";
import type { LegalIdType } from "@/lib/kycOptions";

// ============================================================
// Company-first onboarding.
//
// "Registering is registering the company": a member's first act is to
// name the company they represent by its legal id. If CR-CIPI already knows
// that company, we never create a duplicate listing; the member asks for
// access instead and the Chamber (who manages ownership) decides.
//
//   accessRequests/{id}
//     -> { providerId, providerName, userId, email, name, note, status,
//          createdAt, resolvedAt }
// ============================================================

export const LANGUAGES = ["es", "en", "fr", "de", "pt", "it", "zh"] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Language, { en: string; es: string }> = {
  es: { en: "Spanish", es: "Español" },
  en: { en: "English", es: "Inglés" },
  fr: { en: "French", es: "Francés" },
  de: { en: "German", es: "Alemán" },
  pt: { en: "Portuguese", es: "Portugués" },
  it: { en: "Italian", es: "Italiano" },
  zh: { en: "Chinese", es: "Chino" },
};

export async function findProviderByLegalId(
  type: LegalIdType,
  legalId: string
): Promise<{ id: string; name: string; ownerId: string | null } | null> {
  const snap = await db
    .collection("providers")
    .where("legalIdKey", "==", legalIdKey(type, legalId))
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const data = doc.data() as Record<string, unknown>;
  return { id: doc.id, name: String(data.name ?? ""), ownerId: data.ownerId ? String(data.ownerId) : null };
}

export interface AccessRequest {
  id: string;
  providerId: string;
  providerName: string;
  userId: string;
  email: string;
  name: string;
  note: string;
  status: "pending" | "approved" | "declined";
  createdAt: number;
  resolvedAt: number | null;
}

function requestsCol() {
  return db.collection("accessRequests");
}

// One open request per (user, provider): asking twice just returns the first.
export async function createAccessRequest(input: {
  providerId: string;
  providerName: string;
  userId: string;
  email: string;
  name: string;
  note: string;
}): Promise<{ request: AccessRequest; created: boolean }> {
  const id = `${input.providerId}_${input.userId}`;
  const ref = requestsCol().doc(id);
  const existing = await ref.get();
  if (existing.exists && (existing.data() as AccessRequest).status === "pending") {
    return { request: { ...(existing.data() as AccessRequest), id }, created: false };
  }
  const request: Omit<AccessRequest, "id"> = {
    ...input,
    status: "pending",
    createdAt: Date.now(),
    resolvedAt: null,
  };
  await ref.set(request);
  return { request: { id, ...request }, created: true };
}

export async function listAccessRequests(status?: AccessRequest["status"]): Promise<AccessRequest[]> {
  const snap = status
    ? await requestsCol().where("status", "==", status).get()
    : await requestsCol().get();
  return snap.docs
    .map((doc) => ({ ...(doc.data() as Omit<AccessRequest, "id">), id: doc.id }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function listAccessRequestsByUser(userId: string): Promise<AccessRequest[]> {
  const snap = await requestsCol().where("userId", "==", userId).get();
  return snap.docs.map((doc) => ({ ...(doc.data() as Omit<AccessRequest, "id">), id: doc.id }));
}

export async function resolveAccessRequest(
  id: string,
  decision: "approved" | "declined"
): Promise<AccessRequest | null> {
  const ref = requestsCol().doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const current = { ...(snap.data() as Omit<AccessRequest, "id">), id };
  if (current.status !== "pending") return current;
  await ref.set({ status: decision, resolvedAt: Date.now() }, { merge: true });
  return { ...current, status: decision, resolvedAt: Date.now() };
}
