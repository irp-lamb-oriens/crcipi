import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { isLocale } from "@/content";
import { site } from "@/content/site";
import { getLiveContent } from "@/lib/contentStore";
import { buildPageMetadata } from "@/lib/metadata";
import { ARTICLE_CATEGORY_LABELS } from "@/lib/articleOptions";
import { getPublishedBySlug, recordArticleView } from "@/lib/articles";
import { recordProviderStat } from "@/lib/providerStats";
import ShareBar from "@/components/ShareBar";
import { recordEvent } from "@/lib/stats";
import RichText from "@/components/RichText";
import styles from "./page.module.scss";

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
  recordProviderStat(article.providerId, "articleReads");
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
    <article className={styles.page} lang={article.language}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />
      <div className={styles.progress} aria-hidden="true" />
      <header className={styles.head}>
        <Link href={`/${locale}/blog`} className={styles.back}>
          ← {copy.back}
        </Link>
        <p className="eyebrow">{ARTICLE_CATEGORY_LABELS[article.category][locale]}</p>
        <h1 className={styles.title}>
          <span className="lineMask">
            <span>{article.title}</span>
          </span>
        </h1>
        <p className={styles.dek}>{article.excerpt}</p>
        <div className={styles.byline}>
          <span className={styles.avatar} aria-hidden="true">
            {article.authorName.slice(0, 1).toUpperCase()}
          </span>
          <span>
            <strong>{article.authorName}</strong>
            {article.providerName ? <span className={styles.firm}>{article.providerName}</span> : null}
          </span>
          <span className={styles.meta}>
            {copy.published} {published} · {article.readingMinutes} {content.blog.list.minutes}
          </span>
        </div>
      </header>
      {article.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={article.coverUrl} alt="" className={styles.cover} />
      ) : (
        <div className={styles.rule} aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      )}
      <RichText text={article.body} className={styles.prose} />
      <footer className={styles.foot}>
        <ShareBar url={`${site.domain}/${article.language}/blog/${article.slug}`} title={article.title} locale={locale} />
        <p className={styles.disclaimer}>{copy.disclaimer}</p>
        <Link href={`/${locale}/blog`} className="btn btn--ghost">
          ← {copy.back}
        </Link>
      </footer>
    </article>
  );
}
