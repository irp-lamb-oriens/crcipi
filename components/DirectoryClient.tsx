"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/content/types";
import type { DirectoryContent } from "@/content/types";
import {
  PROVIDER_CATEGORIES,
  PROVIDER_CATEGORY_LABELS,
  type ProviderCategory,
} from "@/lib/providerCategories";
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
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle"
  );
  const [error, setError] = useState("");

  const categoryLabel = PROVIDER_CATEGORY_LABELS[provider.category][locale];

  async function submitReview(event: React.FormEvent) {
    event.preventDefault();
    if (rating < 1) {
      setError(copy.rating.errors.rating);
      return;
    }
    if (!name.trim()) {
      setError(copy.rating.errors.name);
      return;
    }

    setStatus("submitting");
    setError("");
    try {
      const res = await fetch(`/api/providers/${provider.id}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, reviewerName: name.trim(), comment }),
      });
      if (res.ok) {
        setStatus("success");
      } else {
        setStatus("error");
        setError(copy.rating.errors.generic);
      }
    } catch {
      setStatus("error");
      setError(copy.rating.errors.generic);
    }
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
        <Stars value={provider.rating ?? 0} />
        {provider.reviews > 0 ? (
          <span className={styles.reviews}>
            {provider.rating?.toFixed(1)} · {provider.reviews} {copy.card.reviews}
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
        {status === "success" ? (
          <div className={styles.success} role="status" aria-live="polite">
            <span>{copy.rating.success}</span>
            <span className={styles.pendingNote}>{copy.rating.pending}</span>
          </div>
        ) : (
          <button
            type="button"
            className={styles.reviewButton}
            onClick={() => setShowReview((value) => !value)}
            aria-expanded={showReview}
          >
            {copy.rating.heading}
          </button>
        )}
      </div>

      {showReview && status !== "success" ? (
        <form className={styles.form} onSubmit={submitReview} noValidate>
          <div className={styles.field}>
            <span className={styles.label}>{copy.rating.ratingLabel}</span>
            <div className={styles.starInput} role="radiogroup" aria-label={copy.rating.ratingLabel}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.starButton} ${
                    value <= (hovered || rating) ? styles.starOn : ""
                  }`}
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={`${value}`}
                  onMouseEnter={() => setHovered(value)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setRating(value)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                    fill={value <= (hovered || rating) ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 3.5 14.6 9l6 .8-4.4 4.2 1.1 5.9L12 17l-5.3 2.9 1.1-5.9L3.4 9.8l6-.8L12 3.5z" />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor={`name-${provider.id}`}>
              {copy.rating.nameLabel}
            </label>
            <input
              id={`name-${provider.id}`}
              type="text"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor={`comment-${provider.id}`}>
              {copy.rating.commentLabel}
            </label>
            <textarea
              id={`comment-${provider.id}`}
              className={`${styles.input} ${styles.textarea}`}
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className={styles.submit}
            disabled={status === "submitting"}
          >
            {status === "submitting" ? copy.rating.submitting : copy.rating.submit}
          </button>
        </form>
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