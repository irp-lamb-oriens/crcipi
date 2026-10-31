import { getSessionUser, hasPermission } from "@/lib/auth";
import { listAllArticles } from "@/lib/articles";
import { fail, ok } from "@/lib/http";

// GET /api/admin/articles — every article with AI + human review data.
export async function GET() {
  if (!hasPermission(await getSessionUser(), "articles.moderate")) return fail("unauthorized", 401);
  return ok({ articles: await listAllArticles() });
}
