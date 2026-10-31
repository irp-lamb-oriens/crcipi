import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";

// ============================================================
// Per-member monthly counters, for each member's monthly report.
//
//   providers/{id}/monthly/{YYYY-MM}
//     -> { month, profileViews, articleReads, jobViews, applications }
//
// One document per member per month; every increment is one atomic write.
// Fire-and-forget like lib/stats.ts: metrics never fail a page.
// ============================================================

export const PROVIDER_COUNTERS = ["profileViews", "articleReads", "jobViews", "applications"] as const;
export type ProviderCounter = (typeof PROVIDER_COUNTERS)[number];

export function monthKey(time = Date.now()): string {
  return new Date(time).toISOString().slice(0, 7);
}

export function recordProviderStat(providerId: string | null | undefined, counter: ProviderCounter): void {
  if (!providerId) return;
  const month = monthKey();
  void db
    .collection("providers")
    .doc(providerId)
    .collection("monthly")
    .doc(month)
    .set({ month, [counter]: FieldValue.increment(1) }, { merge: true })
    .catch((error) => console.error(`provider stat ${counter} failed`, error));
}

export async function getProviderMonth(
  providerId: string,
  month: string
): Promise<Record<ProviderCounter, number>> {
  const snap = await db.collection("providers").doc(providerId).collection("monthly").doc(month).get();
  const d = (snap.data() ?? {}) as Record<string, unknown>;
  return Object.fromEntries(PROVIDER_COUNTERS.map((c) => [c, Number(d[c] ?? 0) || 0])) as Record<
    ProviderCounter,
    number
  >;
}
