"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Locale } from "@/content/types";
import type { DirectoryContent } from "@/content/types";
import {
  PROVIDER_CATEGORIES,
  PROVIDER_CATEGORY_LABELS,
  type ProviderCategory,
} from "@/lib/providerCategories";
import ReviewModal from "./ReviewModal";
import Seal from "@/components/brand/Seal";
import styles from "./DirectoryClient.module.scss";

export interface DirectoryProvider {
  id: string;
  name: string;
  category: ProviderCategory;
  description: string;
  location: string | null;
  logoUrl: string | null;
  featured: boolean;
  verified: boolean;
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
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const normalized = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    return providers.filter((provider) => {
      const inCategory = active === "all" || provider.category === active;
      if (!inCategory) return false;
      if (verifiedOnly && !provider.verified) return false;
      if (!normalized) return true;
      const categoryLabel = PROVIDER_CATEGORY_LABELS[provider.category][locale];
  const profileHref = `${locale === "en" ? "/en/directory" : "/es/directorio"}/${provider.id}`;
      return (
        provider.name.toLowerCase().includes(normalized) ||
        provider.description.toLowerCase().includes(normalized) ||
        categoryLabel.toLowerCase().includes(normalized) ||
        (provider.location ?? "").toLowerCase().includes(normalized)
      );
    });
  }, [providers, active, verifiedOnly, normalized, locale]);

  const count = filtered.length;
  const countLabel =
    locale === "en"
      ? `${count} ${count === 1 ? "member" : "members"}`
      : `${count} ${count === 1 ? "miembro" : "miembros"}`;

  return (
    <section className={styles.section} aria-label={copy.hero.heading}>
      {/* The register's reading bar: sticks under the header while browsing. */}
      <div className={styles.bar}>
        <div className={styles.barInner}>
          <label className={styles.searchLabel} htmlFor="directory-search">
            <span className="srOnly">{copy.filters.search}</span>
            <svg className={styles.searchIcon} viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              id="directory-search"
              type="search"
              className={styles.search}
              placeholder={copy.filters.searchPlaceholder}
              value={query}
              autoComplete="off"
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <p className={styles.count} aria-live="polite">
            {countLabel}
          </p>
          <div className={styles.filters} role="group" aria-label={copy.filters.browse}>
            <FilterPill label={copy.filters.all} selected={active === "all"} onClick={() => setActive("all")} />
            <FilterPill
              label={copy.filters.verifiedOnly}
              selected={verifiedOnly}
              onClick={() => setVerifiedOnly((value) => !value)}
              verified
            />
            <span className={styles.divider} aria-hidden="true" />
            {PROVIDER_CATEGORIES.map((category) => (
              <FilterPill
                key={category}
                label={PROVIDER_CATEGORY_LABELS[category][locale]}
                selected={active === category}
                onClick={() => setActive(active === category ? "all" : category)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className={styles.inner}>
        {count === 0 ? (
          <p className={styles.empty}>{copy.filters.noResults}</p>
        ) : (
          <ol className={styles.register}>
            {filtered.map((provider, index) => (
              <li key={provider.id} className={styles.entry}>
                <ProviderCard provider={provider} locale={locale} copy={copy} index={index} />
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function FilterPill({
  label,
  selected,
  onClick,
  verified,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  verified?: boolean;
}) {
  return (
    <button
      type="button"
      className={`${styles.pill} ${selected ? styles.pillActive : ""} ${verified ? styles.pillVerified : ""}`}
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
  index,
}: {
  provider: DirectoryProvider;
  locale: Locale;
  copy: DirectoryContent;
  index: number;
}) {
  const [showReview, setShowReview] = useState(false);
  const [reviews, setReviews] = useState(provider.reviews);
  const [average, setAverage] = useState<number | null>(provider.rating);
  const categoryLabel = PROVIDER_CATEGORY_LABELS[provider.category][locale];
  const profileHref = `${locale === "en" ? "/en/directory" : "/es/directorio"}/${provider.id}`;
  const monogram = provider.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  function handleSubmitted(nextAverage: number | null, nextCount: number) {
    setAverage(nextAverage);
    setReviews(nextCount);
  }

  return (
    <article className={styles.row} aria-labelledby={`provider-${provider.id}`}>
      <span className={styles.folio} aria-hidden="true">
        {String(index + 1).padStart(3, "0")}
      </span>

      <div className={styles.avatar} aria-hidden="true">
        {provider.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={provider.logoUrl} alt="" className={styles.logo} loading="lazy" />
        ) : (
          <span className={styles.monogram}>{monogram}</span>
        )}
      </div>

      <div className={styles.main}>
        <h3 className={styles.name} id={`provider-${provider.id}`}>
          <Link href={profileHref} className={styles.nameLink}>
            {provider.name}
          </Link>
        </h3>
        <p className={styles.meta}>
          <span>{categoryLabel}</span>
          {provider.location ? <span>{provider.location}</span> : null}
          {provider.featured ? <span className={styles.featured}>{copy.card.featured}</span> : null}
        </p>
        <p className={styles.description}>{provider.description}</p>
      </div>

      <div className={styles.trust}>
        {provider.verified ? (
          <span className={styles.stamp} title={copy.card.verifiedHint}>
            <Seal id={`p-${provider.id}`} size="sm" spin={false} label={copy.card.verified} />
            <span className={styles.stampLabel}>{copy.card.verified}</span>
          </span>
        ) : null}
        <span className={styles.rating}>
          <Stars value={average ?? 0} />
          <span className={styles.reviews}>
            {reviews > 0 ? `${average?.toFixed(1)} · ${reviews} ${copy.card.reviews}` : copy.card.noReviews}
          </span>
        </span>
      </div>

      <div className={styles.actions}>
        <Link href={`${profileHref}#contact`} className={styles.consult}>
          {locale === "en" ? "Request a consultation" : "Solicitar consulta"}
          <span aria-hidden="true"> →</span>
          <span className="srOnly"> {provider.name}</span>
        </Link>
        {provider.website ? (
          <a className={styles.action} href={provider.website} target="_blank" rel="noopener noreferrer">
            {copy.card.visit} <span aria-hidden="true">↗</span>
            <span className="srOnly"> {provider.name}</span>
          </a>
        ) : null}
        {provider.email ? (
          <a className={styles.action} href={`mailto:${provider.email}`}>
            {provider.email}
          </a>
        ) : null}
        {provider.phone ? (
          <a className={styles.action} href={`tel:${provider.phone}`}>
            {provider.phone}
          </a>
        ) : null}
        <button type="button" className={styles.reviewButton} onClick={() => setShowReview(true)}>
          {copy.rating.heading}
          <span className="srOnly"> {provider.name}</span>
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