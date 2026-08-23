import "server-only";

import { db } from "@/lib/firebaseAdmin";
import { content, getContent } from "@/content";
import type { Locale, PageContent } from "@/content/types";
import { LayeredCache, serialize, type DbBackend } from "@/lib/cache";

// Firestore structure:
//   sites/crcipi/content/{locale}   -> live content document (shallow object)
//   sites/crcipi/history/{locale}/entries/{entryId} -> previous snapshots
//
// Live content wins over the bundled static content. A document that is
// missing a field simply keeps the static default for that field.
//
// Caching: a layered cache (memory semi-LIFO stack + optional localStorage)
// fronts the DB. Entities are keyed by their exact document path, never a
// single glued blob, so a mutation only invalidates its own subtree and can
// never race a sibling document. History entries are cached individually by
// their own path; the history list itself is a cheap ordered query and is
// deliberately left uncached so we never store a monolithic collection blob.

const SITE_ID = "crcipi";

function contentDoc(locale: string) {
  return db.collection("sites").doc(SITE_ID).collection("content").doc(locale);
}

function historyEntries(locale: string) {
  return db
    .collection("sites")
    .doc(SITE_ID)
    .collection("history")
    .doc(locale)
    .collection("entries");
}

function historyEntry(locale: string, entryId: string) {
  return historyEntries(locale).doc(entryId);
}

// ---------------------------------------------------------------------------
// Firestore-backed cache backend (resolves a path to a document reference)
// ---------------------------------------------------------------------------

function docRefForPath(path: string): FirebaseFirestore.DocumentReference {
  const content = /^content\/(en|es)$/.exec(path);
  if (content) return contentDoc(content[1]);

  const entry = /^history\/(en|es)\/entries\/([^/]+)$/.exec(path);
  if (entry) return historyEntry(entry[1], entry[2]);

  throw new Error(`cache: unsupported path ${path}`);
}

const firestoreBackend: DbBackend<Record<string, unknown>> = {
  async get(path) {
    const snap = await docRefForPath(path).get();
    return snap.exists ? (snap.data() as Record<string, unknown>) : null;
  },
  async set(path, value) {
    await docRefForPath(path).set(value);
  },
};

// Granular path cache. A schema must repeat twice before it is cached, and the
// cached copy re-validates against Firestore only on power-of-two counts.
const cache = new LayeredCache<Record<string, unknown>>(firestoreBackend, undefined, {
  maxBytes: 1_500_000,
  minRepeats: 2,
});

function contentPath(locale: string): string {
  return `content/${locale}`;
}

function deepMerge<T>(base: T, patch: unknown): T {
  if (
    patch === null ||
    typeof patch !== "object" ||
    Array.isArray(patch) ||
    patch === undefined
  ) {
    return patch as T;
  }
  if (base === null || typeof base !== "object" || Array.isArray(base)) {
    return patch as T;
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const key of Object.keys(patch as Record<string, unknown>)) {
    const next = (patch as Record<string, unknown>)[key];
    if (
      next !== null &&
      typeof next === "object" &&
      !Array.isArray(next) &&
      out[key] !== null &&
      typeof out[key] === "object" &&
      !Array.isArray(out[key])
    ) {
      out[key] = deepMerge(out[key], next);
    } else {
      out[key] = next;
    }
  }
  return out as T;
}

export async function getLiveContent(locale: string): Promise<PageContent> {
  const base = getContent(locale as Locale);
  try {
    const data = await cache.get(contentPath(locale));
    if (!data) return base;
    return deepMerge(base, data);
  } catch (error) {
    console.error(`Failed to read live content for ${locale}, using static:`, error);
    return base;
  }
}

export async function saveContent(
  locale: string,
  next: PageContent
): Promise<void> {
  const livePath = contentDoc(locale);

  // Write a history snapshot of the current live doc first, then overwrite live.
  let previous: PageContent | null = null;
  const prevSnap = await livePath.get();
  if (prevSnap.exists) {
    previous = prevSnap.data() as PageContent;
  }

  // No-change guard: if the incoming full content equals the currently
  // effective merged content, this is a duplicate save (autosave firing on an
  // untouched document, or a second admin re-submitting the same value). Skip
  // both the history snapshot and the write so no-change operations from
  // multiple sources never pollute history or storm the DB.
  const base = getContent(locale as Locale);
  const effective = previous ? deepMerge(base, previous) : base;
  if (serialize(effective) === serialize(next)) {
    return;
  }

  if (previous) {
    const entry = {
      content: previous,
      savedAt: Date.now(),
    };
    await historyEntries(locale).add(entry);
  }

  await cache.set(contentPath(locale), next as unknown as Record<string, unknown>);
}

export interface HistoryEntry {
  entryId: string;
  savedAt: number;
  content: PageContent;
}

export async function getHistory(locale: string): Promise<HistoryEntry[]> {
  const snap = await historyEntries(locale).orderBy("savedAt", "desc").limit(25).get();
  return snap.docs.map((doc) => ({
    entryId: doc.id,
    savedAt: (doc.data().savedAt as number) ?? 0,
    content: doc.data().content as PageContent,
  }));
}

export async function restoreContent(
  locale: string,
  entryId: string
): Promise<PageContent> {
  const entryRef = historyEntry(locale, entryId);
  const snap = await entryRef.get();
  if (!snap.exists) {
    throw new Error("history_not_found");
  }
  const restored = snap.data()?.content as PageContent;
  await cache.set(contentPath(locale), restored as unknown as Record<string, unknown>);
  return restored;
}

// Convenience for seed/scripts.
export function staticContent(): Record<Locale, PageContent> {
  return content;
}