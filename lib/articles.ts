import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";
import {
  ARTICLE_CATEGORIES,
  ARTICLE_LIMITS,
  ARTICLE_STATUSES,
  readingMinutes,
  type ArticleCategory,
  type ArticleStatus,
} from "@/lib/articleOptions";
import { moderateArticle, type ModerationResult } from "@/lib/moderation";

// ============================================================
// Member articles ("Insights" blog) with AI-first editorial review.
//
//   articles/{id} -> Article
//
// Lifecycle:
//   draft -> (submit) -> AI review -> published | rejected | in_review
//   in_review -> (admin) -> published | rejected
//   any -> (admin) -> archived
// Editing a published article and re-submitting runs the review again; until
// it passes, the article leaves the public blog.
// ============================================================

export interface HumanReview {
  decision: "approve" | "reject" | "archive";
  by: string;
  at: number;
  note: string | null;
}

export interface Article {
  id: string;
  slug: string;
  authorId: string;
  authorName: string;
  providerId: string | null;
  providerName: string | null;
  title: string;
  excerpt: string;
  body: string;
  language: "en" | "es";
  category: ArticleCategory;
  coverUrl: string | null;
  status: ArticleStatus;
  moderation: ModerationResult | null;
  humanReview: HumanReview | null;
  readingMinutes: number;
  createdAt: number;
  updatedAt: number;
  submittedAt: number | null;
  publishedAt: number | null;
  viewsCount: number;
}

function articlesCol() {
  return db.collection("articles");
}

function pick<T extends string>(list: readonly T[], value: unknown, fallback: T): T {
  return (list as readonly unknown[]).includes(value) ? (value as T) : fallback;
}

function toArticle(id: string, d: Record<string, unknown>): Article {
  return {
    id,
    slug: String(d.slug ?? id),
    authorId: String(d.authorId ?? ""),
    authorName: String(d.authorName ?? ""),
    providerId: d.providerId ? String(d.providerId) : null,
    providerName: d.providerName ? String(d.providerName) : null,
    title: String(d.title ?? ""),
    excerpt: String(d.excerpt ?? ""),
    body: String(d.body ?? ""),
    language: d.language === "es" ? "es" : "en",
    category: pick(ARTICLE_CATEGORIES, d.category, "other"),
    coverUrl: d.coverUrl ? String(d.coverUrl) : null,
    status: pick(ARTICLE_STATUSES, d.status, "draft"),
    moderation: (d.moderation as ModerationResult | null) ?? null,
    humanReview: (d.humanReview as HumanReview | null) ?? null,
    readingMinutes: Number(d.readingMinutes ?? 1),
    createdAt: Number(d.createdAt ?? 0),
    updatedAt: Number(d.updatedAt ?? 0),
    submittedAt: typeof d.submittedAt === "number" ? d.submittedAt : null,
    publishedAt: typeof d.publishedAt === "number" ? d.publishedAt : null,
    viewsCount: Number(d.viewsCount ?? 0),
  };
}

export function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "article";
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getArticle(id: string): Promise<Article | null> {
  const snap = await articlesCol().doc(id).get();
  return snap.exists ? toArticle(id, snap.data() as Record<string, unknown>) : null;
}

export async function getPublishedBySlug(slug: string): Promise<Article | null> {
  const snap = await articlesCol().where("slug", "==", slug).limit(1).get();
  const doc = snap.docs[0];
  if (!doc) return null;
  const article = toArticle(doc.id, doc.data() as Record<string, unknown>);
  return article.status === "published" ? article : null;
}

export async function listPublished(): Promise<Article[]> {
  const snap = await articlesCol().where("status", "==", "published").get();
  return snap.docs
    .map((doc) => toArticle(doc.id, doc.data() as Record<string, unknown>))
    .sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
}

export async function listByAuthor(authorId: string): Promise<Article[]> {
  const snap = await articlesCol().where("authorId", "==", authorId).get();
  return snap.docs
    .map((doc) => toArticle(doc.id, doc.data() as Record<string, unknown>))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function listAllArticles(): Promise<Article[]> {
  const snap = await articlesCol().get();
  return snap.docs
    .map((doc) => toArticle(doc.id, doc.data() as Record<string, unknown>))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ArticleInput {
  title: string;
  excerpt: string;
  body: string;
  language: "en" | "es";
  category: ArticleCategory;
  coverUrl: string | null;
  providerId: string | null;
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function validateArticle(
  raw: unknown,
  options: { submit: boolean; authorId: string }
): { ok: true; data: ArticleInput } | { ok: false; errors: Record<string, string> } {
  const body = (raw ?? {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const title = text(body.title, ARTICLE_LIMITS.title);
  const excerpt = text(body.excerpt, ARTICLE_LIMITS.excerpt);
  const content = typeof body.body === "string" ? body.body.trim().slice(0, ARTICLE_LIMITS.bodyMax) : "";
  const coverUrl = text(body.coverUrl, 300) || null;
  const providerId = text(body.providerId, 100) || null;

  if (!title) errors.title = "required";
  // Covers must be images this author uploaded through /api/member/uploads.
  if (coverUrl && !coverUrl.startsWith(`/api/media/public/images/${options.authorId}/`)) {
    errors.coverUrl = "invalid";
  }
  if (options.submit) {
    if (!excerpt) errors.excerpt = "required";
    if (content.length < ARTICLE_LIMITS.bodyMin) errors.body = "too_short";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      title,
      excerpt,
      body: content,
      language: body.language === "es" ? "es" : "en",
      category: pick(ARTICLE_CATEGORIES, body.category, "other"),
      coverUrl,
      providerId,
    },
  };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function saveArticle(
  existing: Article | null,
  input: ArticleInput,
  author: { authorId: string; authorName: string; providerName: string | null },
  submit: boolean
): Promise<Article> {
  const now = Date.now();
  const ref = existing ? articlesCol().doc(existing.id) : articlesCol().doc();
  // The slug is fixed at creation so shared links never break on edits.
  const slug = existing?.slug ?? `${slugify(input.title)}-${ref.id.slice(0, 6).toLowerCase()}`;

  const data = {
    ...input,
    slug,
    authorId: author.authorId,
    authorName: author.authorName,
    providerName: author.providerName,
    readingMinutes: readingMinutes(input.body),
    status: (submit ? "in_review" : existing?.status === "published" ? "published" : "draft") as ArticleStatus,
    updatedAt: now,
    createdAt: existing?.createdAt ?? now,
    submittedAt: submit ? now : (existing?.submittedAt ?? null),
    publishedAt: existing?.publishedAt ?? null,
    viewsCount: existing?.viewsCount ?? 0,
    moderation: submit ? null : (existing?.moderation ?? null),
    humanReview: submit ? null : (existing?.humanReview ?? null),
  };

  // Draft edits to a published article are not allowed to change what the
  // public sees without review: they must be submitted.
  if (!submit && existing?.status === "published") {
    throw new Error("published_requires_submit");
  }

  await ref.set(data);
  return toArticle(ref.id, data);
}

// Runs the AI reviewer and applies its decision. Never publishes on failure.
export async function runModeration(article: Article): Promise<Article> {
  const result = await moderateArticle({
    title: article.title,
    excerpt: article.excerpt,
    body: article.body,
    language: article.language,
    category: article.category,
  });

  const now = Date.now();
  const status: ArticleStatus =
    result.decision === "approve" ? "published" : result.decision === "reject" ? "rejected" : "in_review";

  const patch = {
    moderation: result,
    status,
    updatedAt: now,
    ...(status === "published" ? { publishedAt: article.publishedAt ?? now } : {}),
  };
  await articlesCol().doc(article.id).set(patch, { merge: true });
  return { ...article, ...patch };
}

export async function applyHumanReview(
  article: Article,
  decision: HumanReview["decision"],
  reviewer: string,
  note: string
): Promise<Article> {
  const now = Date.now();
  const status: ArticleStatus =
    decision === "approve" ? "published" : decision === "reject" ? "rejected" : "archived";
  const patch = {
    status,
    humanReview: { decision, by: reviewer, at: now, note: note.trim().slice(0, 1000) || null },
    updatedAt: now,
    ...(status === "published" ? { publishedAt: article.publishedAt ?? now } : {}),
  };
  await articlesCol().doc(article.id).set(patch, { merge: true });
  return { ...article, ...patch };
}

export async function deleteArticle(id: string): Promise<void> {
  await articlesCol().doc(id).delete();
}

export function recordArticleView(id: string): void {
  void articlesCol()
    .doc(id)
    .update({ viewsCount: FieldValue.increment(1) })
    .catch(() => {});
}
