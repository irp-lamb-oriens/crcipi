import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";

// ============================================================
// Funnel metrics.
//
// One document per UTC day holds a counter per event, so a 30-day funnel is a
// single 30-document range read and every increment is one atomic write:
//
//   stats/daily/days/{YYYY-MM-DD} -> { [event]: number, day: "YYYY-MM-DD" }
//
// Per-entity counters (a job's views, an article's views) live on the entity
// itself; this module only tracks platform-wide totals for the admin funnel.
// Recording is fire-and-forget: metrics must never fail a user request.
// ============================================================

export const STAT_EVENTS = [
  "directory_view",
  "member_signup",
  "provider_created",
  "kyc_submitted",
  "kyc_verified",
  "review_submitted",
  "job_posted",
  "job_view",
  "job_apply",
  "article_submitted",
  "article_published",
  "article_view",
] as const;

export type StatEvent = (typeof STAT_EVENTS)[number];

export interface DailyStats {
  day: string;
  counts: Record<StatEvent, number>;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysCol() {
  return db.collection("stats").doc("daily").collection("days");
}

export function dayKey(time: number = Date.now()): string {
  return new Date(time).toISOString().slice(0, 10);
}

export function recordEvent(event: StatEvent, amount = 1): void {
  void daysCol()
    .doc(dayKey())
    .set({ day: dayKey(), [event]: FieldValue.increment(amount) }, { merge: true })
    .catch((error) => console.error(`stats: failed to record ${event}`, error));
}

function emptyCounts(): Record<StatEvent, number> {
  return Object.fromEntries(STAT_EVENTS.map((event) => [event, 0])) as Record<
    StatEvent,
    number
  >;
}

// Returns exactly `days` entries, oldest first, with zero-filled gaps.
export async function getDailyStats(days: number): Promise<DailyStats[]> {
  const span = Math.min(Math.max(Math.trunc(days), 1), 366);
  const keys = Array.from({ length: span }, (_, i) =>
    dayKey(Date.now() - (span - 1 - i) * DAY_MS)
  );

  const snap = await daysCol()
    .where("day", ">=", keys[0])
    .where("day", "<=", keys[keys.length - 1])
    .get();

  const byDay = new Map<string, Record<string, unknown>>();
  snap.docs.forEach((doc) => byDay.set(doc.id, doc.data() as Record<string, unknown>));

  return keys.map((day) => {
    const raw = byDay.get(day) ?? {};
    const counts = emptyCounts();
    for (const event of STAT_EVENTS) {
      const value = Number(raw[event] ?? 0);
      counts[event] = Number.isFinite(value) ? value : 0;
    }
    return { day, counts };
  });
}

export function sumStats(series: DailyStats[]): Record<StatEvent, number> {
  const totals = emptyCounts();
  for (const entry of series) {
    for (const event of STAT_EVENTS) totals[event] += entry.counts[event];
  }
  return totals;
}
