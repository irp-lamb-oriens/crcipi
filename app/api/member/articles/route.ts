import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listByAuthor, saveArticle, validateArticle } from "@/lib/articles";
import { reviewAndNotify } from "@/lib/articleWorkflow";
import { fail, ok, readJson } from "@/lib/http";
import { getProvider } from "@/lib/providers";
import { rateLimit } from "@/lib/rateLimit";
import { recordEvent } from "@/lib/stats";

// GET  /api/member/articles — own articles with review results.
// POST /api/member/articles — create; with { submit: true } the AI review
// runs immediately and the response carries its decision.

export const maxDuration = 26;

const SUBMIT_LIMIT = { max: 10, windowMs: 24 * 60 * 60 * 1000, baseBackoffMs: 60 * 60 * 1000 };

export async function GET() {
  const user = await getSessionUser();
  if (!user) return fail("unauthorized", 401);
  return ok({ articles: await listByAuthor(user.userId) });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return fail("unauthorized", 401);
  const body = await readJson(request);
  if (!body) return fail("invalid_json", 400);
  const submit = body.submit === true;

  const result = validateArticle(body, { submit, authorId: user.userId });
  if (!result.ok) return fail("validation", 422, { errors: result.errors });

  let providerName: string | null = null;
  if (result.data.providerId) {
    const provider = await getProvider(result.data.providerId);
    if (!provider || provider.ownerId !== user.userId) {
      return fail("validation", 422, { errors: { providerId: "not_yours" } });
    }
    providerName = provider.name;
  }

  if (submit) {
    const limit = await rateLimit(`article:${user.userId}`, SUBMIT_LIMIT);
    if (!limit.ok) return fail("rate_limited", 429);
  }

  try {
    let article = await saveArticle(
      null,
      result.data,
      { authorId: user.userId, authorName: user.name || user.email.split("@")[0], providerName },
      submit
    );
    if (submit) {
      recordEvent("article_submitted");
      article = await reviewAndNotify(article);
    }
    return ok({ article }, 201);
  } catch (error) {
    console.error("article create failed", error);
    return fail("storage_failed", 500);
  }
}
