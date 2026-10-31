"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { BlogContent, Locale } from "@/content/types";
import {
  ARTICLE_CATEGORIES,
  ARTICLE_CATEGORY_LABELS,
  type ArticleCategory,
} from "@/lib/articleOptions";
import styles from "./Listing.module.scss";

export interface BlogCard {
  slug: string;
  title: string;
  excerpt: string;
  category: ArticleCategory;
  language: Locale;
  coverUrl: string | null;
  author: string;
  minutes: number;
  publishedAt: number;
}

export default function BlogList({
  locale,
  articles,
  copy,
}: {
  locale: Locale;
  articles: BlogCard[];
  copy: BlogContent;
}) {
  const [category, setCategory] = useState<ArticleCategory | "all">("all");
  const present = useMemo(
    () => ARTICLE_CATEGORIES.filter((c) => articles.some((a) => a.category === c)),
    [articles]
  );
  const visible = articles.filter((a) => category === "all" || a.category === category);
  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CR", { dateStyle: "medium" });

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        {present.length > 1 ? (
          <div className={styles.pills} role="group">
            <button type="button" className={`${styles.pill} ${category === "all" ? styles.pillActive : ""}`}
              aria-pressed={category === "all"} onClick={() => setCategory("all")}>
              {copy.list.all}
            </button>
            {present.map((c) => (
              <button key={c} type="button" className={`${styles.pill} ${category === c ? styles.pillActive : ""}`}
                aria-pressed={category === c} onClick={() => setCategory(c)}>
                {ARTICLE_CATEGORY_LABELS[c][locale]}
              </button>
            ))}
          </div>
        ) : null}

        {visible.length === 0 ? (
          <p className={styles.empty}>{copy.list.empty}</p>
        ) : (
          <ul className={styles.cards}>
            {visible.map((article) => (
              <li key={article.slug}>
                <Link href={`/${locale}/blog/${article.slug}`} className={styles.cardLink} lang={article.language}>
                  {article.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={article.coverUrl} alt="" className={styles.cover} loading="lazy" />
                  ) : (
                    <span className={styles.coverPlaceholder}>{ARTICLE_CATEGORY_LABELS[article.category][locale]}</span>
                  )}
                  <span className={styles.cardBody}>
                    <span className={styles.eyebrow} style={{ marginBottom: 0 }}>
                      {ARTICLE_CATEGORY_LABELS[article.category][locale]}
                      {article.language !== locale ? ` · ${article.language.toUpperCase()}` : ""}
                    </span>
                    <span className={styles.cardTitle}>{article.title}</span>
                    <span className={styles.cardExcerpt}>{article.excerpt}</span>
                    <span className={styles.cardMeta}>
                      {copy.list.by} {article.author} · {dateFmt.format(article.publishedAt)} · {article.minutes} {copy.list.minutes}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <aside className={styles.promo}>
          <div>
            <h2>{copy.list.writeHeading}</h2>
            <p>{copy.list.writeBody}</p>
          </div>
          <Link href="/account/articles" className="btn btn--primary">{copy.list.writeCta}</Link>
        </aside>
      </div>
    </section>
  );
}
