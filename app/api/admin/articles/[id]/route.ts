import { NextRequest } from "next/server";
import { getSessionUser, getUserById, hasPermission } from "@/lib/auth";
import { applyHumanReview, getArticle } from "@/lib/articles";
import { reviewAndNotify } from "@/lib/articleWorkflow";
import { fail, ok, readJson } from "@/lib/http";
import { notify } from "@/lib/mailer";
import { recordEvent } from "@/lib/stats";

// POST /api/admin/articles/:id
//   { action: "approve" | "reject" | "archive", note }  human editor decision
//   { action: "rerun" }                                  re-run the AI review
// Requires `articles.moderate`. Editors override the AI in both directions.

export const maxDuration = 26;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "articles.moderate")) return fail("unauthorized", 401);

  const { id } = await params;
  const article = await getArticle(id);
  if (!article) return fail("not_found", 404);

  const body = await readJson(request);
  const action = body?.action;
  const note = typeof body?.note === "string" ? body.note : "";

  if (action === "rerun") {
    return ok({ article: await reviewAndNotify(article) });
  }
  if (action !== "approve" && action !== "reject" && action !== "archive") {
    return fail("invalid_action", 422);
  }
  if (action === "reject" && !note.trim()) {
    return fail("validation", 422, { errors: { note: "required" } });
  }

  const updated = await applyHumanReview(article, action, user.email, note);
  if (action === "approve" && article.status !== "published") recordEvent("article_published");

  const author = await getUserById(article.authorId).catch(() => null);
  if (author && action !== "archive") {
    notify({
      to: author.email,
      subject: action === "approve" ? `Published: ${article.title}` : `Your article needs changes: ${article.title}`,
      heading: action === "approve" ? "An editor published your article" : "An editor sent your article back",
      lines: action === "approve" ? [`"${article.title}" is now live.`] : [`Editor's note: ${note.trim()}`],
      cta: {
        label: action === "approve" ? "Read it" : "Edit article",
        url: action === "approve" ? `/${article.language}/blog/${article.slug}` : "/account/articles",
      },
    });
  }

  return ok({ article: updated });
}
