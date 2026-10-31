import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { deleteArticle, getArticle, saveArticle, validateArticle } from "@/lib/articles";
import { reviewAndNotify } from "@/lib/articleWorkflow";
import { fail, ok, readJson } from "@/lib/http";
import { getProvider } from "@/lib/providers";
import { rateLimit } from "@/lib/rateLimit";
import { recordEvent } from "@/lib/stats";

// PATCH  /api/member/articles/:id — edit own article; { submit: true } re-runs review.
// DELETE /api/member/articles/:id — delete own article.
// Archived articles (taken down by an editor) are read-only for the author.

export const maxDuration = 26;

const SUBMIT_LIMIT = { max: 10, windowMs: 24 * 60 * 60 * 1000, baseBackoffMs: 60 * 60 * 1000 };

async function ownedArticle(id: string) {
  const user = await getSessionUser();
  if (!user) return { error: fail("unauthorized", 401) } as const;
  const article = await getArticle(id);
  if (!article) return { error: fail("not_found", 404) } as const;
  if (article.authorId !== user.userId) return { error: fail("forbidden", 403) } as const;
  return { user, article } as const;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await ownedArticle(id);
  if ("error" in owned) return owned.error;
  if (owned.article.status === "archived") return fail("archived", 409);
  if (owned.article.status === "in_review" && owned.article.moderation) {
    // Waiting on a human editor: keep the reviewed version stable.
    return fail("awaiting_editor", 409);
  }

  const body = await readJson(request);
  if (!body) return fail("invalid_json", 400);
  const submit = body.submit === true;
  if (!submit && owned.article.status === "published") return fail("published_requires_submit", 409);

  const result = validateArticle(body, { submit, authorId: owned.user.userId });
  if (!result.ok) return fail("validation", 422, { errors: result.errors });

  let providerName: string | null = null;
  if (result.data.providerId) {
    const provider = await getProvider(result.data.providerId);
    if (!provider || provider.ownerId !== owned.user.userId) {
      return fail("validation", 422, { errors: { providerId: "not_yours" } });
    }
    providerName = provider.name;
  }

  if (submit) {
    const limit = await rateLimit(`article:${owned.user.userId}`, SUBMIT_LIMIT);
    if (!limit.ok) return fail("rate_limited", 429);
  }

  try {
    let article = await saveArticle(
      owned.article,
      result.data,
      {
        authorId: owned.user.userId,
        authorName: owned.user.name || owned.user.email.split("@")[0],
        providerName,
      },
      submit
    );
    if (submit) {
      recordEvent("article_submitted");
      article = await reviewAndNotify(article);
    }
    return ok({ article });
  } catch (error) {
    console.error("article update failed", error);
    return fail("storage_failed", 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await ownedArticle(id);
  if ("error" in owned) return owned.error;
  await deleteArticle(id);
  return ok();
}
