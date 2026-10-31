import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { isLocale } from "@/content";
import { site } from "@/content/site";
import { getLiveContent } from "@/lib/contentStore";
import { buildPageMetadata } from "@/lib/metadata";
import { ARTICLE_CATEGORY_LABELS } from "@/lib/articleOptions";
import { getPublishedBySlug, recordArticleView } from "@/lib/articles";
import { recordEvent } from "@/lib/stats";
import RichText from "@/components/RichText";
import styles from "@/components/Listing.module.scss";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const article = await getPublishedBySlug(slug);
  if (!article) return {};
  const meta = buildPageMetadata({
    path: `/${locale}/blog/${slug}`,
    alternatives: { en: `/en/blog/${slug}`, es: `/es/blog/${slug}` },
    title: `${article.title} | CR-CIPI`,
    description: article.excerpt,
  });
  return {
    ...meta,
    openGraph: {
      ...meta.openGraph,
      type: "article",
      images: article.coverUrl ? [`${site.domain}${article.coverUrl}`] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const [content, article] = await Promise.all([getLiveContent(locale), getPublishedBySlug(slug)]);
  if (!article) notFound();
  const copy = content.blog.article;

  recordArticleView(article.id);
  recordEvent("article_view");

  const published = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CR", { dateStyle: "long" }).format(
    article.publishedAt ?? article.updatedAt
  );
  const ld = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    inLanguage: article.language,
    datePublished: new Date(article.publishedAt ?? article.updatedAt).toISOString(),
    dateModified: new Date(article.updatedAt).toISOString(),
    author: { "@type": "Person", name: article.authorName },
    publisher: { "@type": "Organization", name: site.name, url: site.domain },
    image: article.coverUrl ? `${site.domain}${article.coverUrl}` : undefined,
  }).replace(/</g, "\\u003c");

  return (
    <section className={styles.section}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />
      <div className={`${styles.inner} ${styles.narrow}`}>
        <Link href={`/${locale}/blog`} className={styles.back}>← {copy.back}</Link>
        <article lang={article.language}>
          <p className={styles.eyebrow}>{ARTICLE_CATEGORY_LABELS[article.category][locale]}</p>
          <h1 className={styles.rowTitle} style={{ fontSize: "clamp(1.9rem, 4.5vw, 3rem)", lineHeight: 1.1, marginBottom: "1rem" }}>
            {article.title}
          </h1>
          <div className={styles.byline}>
            <span>
              {copy.by} <strong>{article.authorName}</strong>
              {article.providerName ? `, ${article.providerName}` : ""}
            </span>
            <span>{copy.published} {published}</span>
            <span>{article.readingMinutes} {content.blog.list.minutes}</span>
          </div>
          {article.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={article.coverUrl} alt="" className={styles.articleCover} />
          ) : null}
          <RichText text={article.body} className={styles.prose} />
          <p className={styles.disclaimer}>{copy.disclaimer}</p>
        </article>
      </div>
    </section>
  );
}
