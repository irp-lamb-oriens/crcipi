import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/content";
import { getLiveContent } from "@/lib/contentStore";
import { buildPageMetadata } from "@/lib/metadata";
import { listPublished } from "@/lib/articles";
import PageHero from "@/components/PageHero";
import BlogList, { type BlogCard } from "@/components/BlogList";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const content = await getLiveContent(locale);
  return buildPageMetadata({
    path: `/${locale}/blog`,
    alternatives: { en: "/en/blog", es: "/es/blog" },
    title: content.blog.meta.title,
    description: content.blog.meta.description,
  });
}

export default async function BlogPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [content, articles] = await Promise.all([getLiveContent(locale), listPublished()]);

  // Articles in the reader's language first, then the rest, newest first.
  const cards: BlogCard[] = articles
    .map((a) => ({
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      category: a.category,
      language: a.language,
      coverUrl: a.coverUrl,
      author: a.providerName ? `${a.authorName}, ${a.providerName}` : a.authorName,
      minutes: a.readingMinutes,
      publishedAt: a.publishedAt ?? a.updatedAt,
    }))
    .sort((a, b) => Number(b.language === locale) - Number(a.language === locale));

  return (
    <>
      <PageHero
        pathPrefix="blog.hero"
        eyebrow={content.blog.hero.eyebrow}
        heading={content.blog.hero.heading}
        body={content.blog.hero.body}
      />
      <BlogList locale={locale} articles={cards} copy={content.blog} />
    </>
  );
}
