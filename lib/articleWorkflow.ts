import "server-only";

import { site } from "@/content/site";
import { runModeration, type Article } from "@/lib/articles";
import { getUserById } from "@/lib/auth";
import { notify } from "@/lib/mailer";
import { recordEvent } from "@/lib/stats";

// Side effects shared by the member submit route and the admin "re-run AI"
// action: run the review, count it, and tell the right people.
export async function reviewAndNotify(article: Article): Promise<Article> {
  const reviewed = await runModeration(article);

  if (reviewed.status === "published") recordEvent("article_published");

  if (reviewed.status === "in_review") {
    for (const to of site.notifyEmails) {
      notify({
        to,
        subject: `Article needs an editor: ${reviewed.title}`,
        heading: "An article is waiting for human review",
        lines: [
          `"${reviewed.title}" by ${reviewed.authorName || "a member"}.`,
          ...(reviewed.moderation?.reasons ?? []),
        ],
        cta: { label: "Review articles", url: "/admin/articles" },
      });
    }
  }

  const author = await getUserById(reviewed.authorId).catch(() => null);
  if (author && reviewed.status !== "in_review") {
    const blogPath = reviewed.language === "es" ? "/es/blog" : "/en/blog";
    notify({
      to: author.email,
      subject:
        reviewed.status === "published"
          ? `Published: ${reviewed.title}`
          : `Your article needs changes: ${reviewed.title}`,
      heading: reviewed.status === "published" ? "Your article is live" : "Your article needs changes",
      lines:
        reviewed.status === "published"
          ? [`"${reviewed.title}" is now on the CR-CIPI blog.`]
          : [`"${reviewed.title}" wasn't published yet:`, ...(reviewed.moderation?.reasons ?? [])],
      cta:
        reviewed.status === "published"
          ? { label: "Read it", url: `${blogPath}/${reviewed.slug}` }
          : { label: "Edit article", url: "/account/articles" },
    });
  }

  return reviewed;
}
