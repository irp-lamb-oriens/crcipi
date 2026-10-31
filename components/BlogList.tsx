"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { BlogContent, Locale } from "@/content/types";
import { ARTICLE_CATEGORIES, ARTICLE_CATEGORY_LABELS, type ArticleCategory } from "@/lib/articleOptions";
import styles from "./BlogList.module.scss";

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

// A magazine, not a card grid: the newest piece leads as a cover story, the
// rest form a numbered table of contents whose covers slide in on hover.
export default function BlogList({ locale, articles, copy }: { locale: Locale; articles: BlogCard[]; copy: BlogContent }) {
  const [category, setCategory] = useState<ArticleCategory | "all">("all");
  const present = useMemo(() => ARTICLE_CATEGORIES.filter((c) => articles.some((a) => a.category === c)), [articles]);
  const visible = articles.filter((a) => category === "all" || a.category === category);
  const [lead, ...rest] = visible;
  const date = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CR", { dateStyle: "medium" });
  const href = (a: BlogCard) => `/${locale}/blog/${a.slug}`;

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        {present.length > 1 ? (
          <div className={styles.tabs} role="group" aria-label={copy.list.all}>
            {(["all", ...present] as const).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
                className={`${styles.tab} ${category === c ? styles.tabActive : ""}`}
                onClick={() => setCategory(c)}
              >
                {c === "all" ? copy.list.all : ARTICLE_CATEGORY_LABELS[c][locale]}
              </button>
            ))}
          </div>
        ) : null}

        {!lead ? (
          <p className={styles.empty}>{copy.list.empty}</p>
        ) : (
          <>
            <Link href={href(lead)} className={styles.lead} lang={lead.language}>
              <div className={styles.leadCover}>
                {lead.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={lead.coverUrl} alt="" />
                ) : (
                  <span className={styles.typeCover} aria-hidden="true">
                    {ARTICLE_CATEGORY_LABELS[lead.category][locale]}
                  </span>
                )}
              </div>
              <div className={styles.leadText}>
                <p className="eyebrow">
                  {ARTICLE_CATEGORY_LABELS[lead.category][locale]}
                  {lead.language !== locale ? ` · ${lead.language.toUpperCase()}` : ""}
                </p>
                <h2 className={styles.leadTitle}>{lead.title}</h2>
                <p className={styles.leadExcerpt}>{lead.excerpt}</p>
                <p className={styles.byline}>
                  {copy.list.by} {lead.author} · {date.format(lead.publishedAt)} · {lead.minutes} {copy.list.minutes}
                </p>
                <span className={styles.readMore}>
                  {copy.list.readMore} <span aria-hidden="true">→</span>
                </span>
              </div>
            </Link>

            {rest.length > 0 ? (
              <ol className={styles.toc}>
                {rest.map((a, i) => (
                  <li key={a.slug}>
                    <Link href={href(a)} className={styles.entry} lang={a.language}>
                      <span className={styles.num}>{String(i + 2).padStart(2, "0")}</span>
                      <span className={styles.entryMain}>
                        <span className={styles.entryTitle}>{a.title}</span>
                        <span className={styles.entryMeta}>
                          {ARTICLE_CATEGORY_LABELS[a.category][locale]} · {a.author} · {a.minutes} {copy.list.minutes}
                        </span>
                      </span>
                      <span className={styles.thumb} aria-hidden="true">
                        {a.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={a.coverUrl} alt="" loading="lazy" />
                        ) : (
                          <span>{ARTICLE_CATEGORY_LABELS[a.category][locale]}</span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : null}
          </>
        )}

        <aside className={styles.promo}>
          <div>
            <h2 className={styles.promoTitle}>{copy.list.writeHeading}</h2>
            <p>{copy.list.writeBody}</p>
          </div>
          <Link href="/account/articles" className="btn btn--ghost">
            {copy.list.writeCta}
            <span className="btn__arrow" aria-hidden="true">→</span>
          </Link>
        </aside>
      </div>
    </section>
  );
}
