"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/content/types";
import type { DirectoryContent } from "@/content/types";
import {
  PROVIDER_CATEGORIES,
  PROVIDER_CATEGORY_LABELS,
  type ProviderCategory,
} from "@/lib/providerCategories";
import ReviewModal from "./ReviewModal";
import styles from "./DirectoryClient.module.scss";

export interface DirectoryProvider {
  id: string;
  name: string;
  category: ProviderCategory;
  description: string;
  location: string | null;
  logoUrl: string | null;
  featured: boolean;
  website: string | null;
  email: string | null;
  phone: string | null;
  rating: number | null;
  reviews: number;
}

interface Props {
  locale: Locale;
  providers: DirectoryProvider[];
  copy: DirectoryContent;
}

export default function DirectoryClient({ locale, providers, copy }: Props) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<ProviderCategory | "all">("all");

  const normalized = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    return providers.filter((provider) => {
      const inCategory = active === "all" || provider.category === active;
      if (!inCategory) return false;
      if (!normalized) return true;
      const categoryLabel = PROVIDER_CATEGORY_LABELS[provider.category][locale];
      return (
        provider.name.toLowerCase().includes(normalized) ||
        provider.description.toLowerCase().includes(normalized) ||
        categoryLabel.toLowerCase().includes(normalized) ||
        (provider.location ?? "").toLowerCase().includes(normalized)
      );
    });
  }, [providers, active, normalized, locale]);

  return (
    <section className={styles.section} aria-label={copy.hero.heading}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{copy.filters.browse}</p>
        <div className={styles.toolbar}>
          <label className={styles.searchLabel} htmlFor="directory-search">
            <span className={styles.srOnly}>{copy.filters.search}</span>
            <svg
              className={styles.searchIcon}
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              id="directory-search"
              type="search"
              className={styles.search}
              placeholder={copy.filters.searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>

          <div className={styles.filters} role="group" aria-label={copy.filters.search}>
            <FilterPill
              label={copy.filters.all}
              selected={active === "all"}
              onClick={() => setActive("all")}
            />
            {PROVIDER_CATEGORIES.map((category) => (
              <FilterPill
                key={category}
                label={PROVIDER_CATEGORY_LABELS[category][locale]}
                selected={active === category}
                onClick={() => setActive(category)}
              />
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className={styles.empty}>{copy.filters.noResults}</p>
        ) : (
          <ul className={styles.grid}>
            {filtered.map((provider) => (
              <li key={provider.id} className={styles.item}>
                <ProviderCard provider={provider} locale={locale} copy={copy} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function FilterPill({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.pill} ${selected ? styles.pillActive : ""}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function ProviderCard({
  provider,
  locale,
  copy,
}: {
  provider: DirectoryProvider;
  locale: Locale;
  copy: DirectoryContent;
}) {
  const [showReview, setShowReview] = useState(false);
  const [reviews, setReviews] = useState(provider.reviews);
  const [average, setAverage] = useState<number | null>(provider.rating);

  const categoryLabel = PROVIDER_CATEGORY_LABELS[provider.category][locale];

  function handleSubmitted(nextAverage: number | null, nextCount: number) {
    setAverage(nextAverage);
    setReviews(nextCount);
  }

  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.avatar} aria-hidden="true">
          {provider.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={provider.logoUrl} alt="" className={styles.logo} />
          ) : (
            <span className={styles.monogram}>
              {provider.name
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
                .toUpperCase()}
            </span>
          )}
        </div>
        <div className={styles.titleBlock}>
          <h3 className={styles.name}>{provider.name}</h3>
          <div className={styles.meta}>
            <span className={styles.category}>{categoryLabel}</span>
            {provider.featured ? (
              <span className={styles.featured}>{copy.card.featured}</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className={styles.ratingRow}>
        <Stars value={average ?? 0} />
        {reviews > 0 ? (
          <span className={styles.reviews}>
            {average?.toFixed(1)} · {reviews} {copy.card.reviews}
          </span>
        ) : (
          <span className={styles.reviews}>{copy.card.noReviews}</span>
        )}
      </div>

      <p className={styles.description}>{provider.description}</p>

      {(provider.location ||
        provider.email ||
        provider.phone ||
        provider.website) && (
        <dl className={styles.contact}>
          {provider.location ? (
            <div className={styles.contactRow}>
              <dt className={styles.srOnly}>Location</dt>
              <dd>{provider.location}</dd>
            </div>
          ) : null}
          {provider.website ? (
            <div className={styles.contactRow}>
              <dt className={styles.srOnly}>Website</dt>
              <dd>
                <a href={provider.website} target="_blank" rel="noopener noreferrer">
                  {copy.card.visit}
                </a>
              </dd>
            </div>
          ) : null}
          {provider.email ? (
            <div className={styles.contactRow}>
              <dt className={styles.srOnly}>Email</dt>
              <dd>
                <a href={`mailto:${provider.email}`}>{provider.email}</a>
              </dd>
            </div>
          ) : null}
          {provider.phone ? (
            <div className={styles.contactRow}>
              <dt className={styles.srOnly}>Phone</dt>
              <dd>
                <a href={`tel:${provider.phone}`}>{provider.phone}</a>
              </dd>
            </div>
          ) : null}
        </dl>
      )}

      <div className={styles.reviewToggle}>
        <button
          type="button"
          className={styles.reviewButton}
          onClick={() => setShowReview(true)}
        >
          {copy.rating.heading}
        </button>
      </div>

      {showReview ? (
        <ReviewModal
          providerId={provider.id}
          providerName={provider.name}
          copy={copy.rating}
          onClose={() => setShowReview(false)}
          onSubmitted={handleSubmitted}
        />
      ) : null}
    </article>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span className={styles.stars} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill={star <= Math.round(value) ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3.5 14.6 9l6 .8-4.4 4.2 1.1 5.9L12 17l-5.3 2.9 1.1-5.9L3.4 9.8l6-.8L12 3.5z" />
        </svg>
      ))}
    </span>
  );
}