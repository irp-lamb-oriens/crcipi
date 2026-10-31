import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { isLocale } from "@/content";
import type { Locale } from "@/content/types";
import { getLiveContent } from "@/lib/contentStore";
import { buildPageMetadata } from "@/lib/metadata";
import { listPublished } from "@/lib/articles";
import { listLiveJobs } from "@/lib/jobs";
import { PROFILE_COPY } from "@/lib/leadCopy";
import {
  averageRating,
  getProvider,
  listRatings,
  PROVIDER_CATEGORY_LABELS,
  type Provider,
} from "@/lib/providers";
import { site } from "@/content/site";
import Seal from "@/components/brand/Seal";
import ContactForm from "@/components/ContactForm";
import ProfileReviewButton from "@/components/ProfileReviewButton";
import RichText from "@/components/RichText";
import { scoreProvider } from "@/lib/trustScore";
import styles from "./page.module.scss";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

async function loadProvider(id: string) {
  const provider = await getProvider(id);
  return provider && provider.approved ? provider : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isLocale(locale)) return {};
  const provider = await loadProvider(id);
  if (!provider) return {};
  const description = (locale === "en" ? provider.descriptionEn : provider.descriptionEs).slice(0, 155);
  return buildPageMetadata({
    path: `${locale === "en" ? "/en/directory" : "/es/directorio"}/${id}`,
    alternatives: { en: `/en/directory/${id}`, es: `/es/directorio/${id}` },
    title: `${provider.name} · ${PROVIDER_CATEGORY_LABELS[provider.category][locale]} | CR-CIPI`,
    description,
  });
}

// The machine-readable zone at the foot of a passport data page, rebuilt
// from the member's name and id. Decorative: hidden from assistive tech.
function mrz(provider: Provider): [string, string] {
  const clean = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "<")
      .replace(/^<|<$/g, "");
  const line1 = `P<CRI${clean(provider.name)}`.padEnd(44, "<").slice(0, 44);
  const since = new Date(provider.memberSince || Date.now()).toISOString().slice(2, 10).replace(/-/g, "");
  const line2 = `${clean(provider.id).slice(0, 9).padEnd(9, "<")}CRI${since}${provider.verified ? "V" : "<"}`
    .padEnd(44, "<")
    .slice(0, 44);
  return [line1, line2];
}

function localBusinessLd(provider: Provider, locale: Locale) {
  const average = averageRating(provider);
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: provider.name,
    description: locale === "en" ? provider.descriptionEn : provider.descriptionEs,
    url: provider.website,
    image: provider.logoUrl,
    address: provider.location
      ? { "@type": "PostalAddress", addressLocality: provider.location, addressCountry: "CR" }
      : undefined,
    aggregateRating: average
      ? { "@type": "AggregateRating", ratingValue: average, reviewCount: provider.ratingsCount }
      : undefined,
    memberOf: { "@type": "Organization", name: site.fullName, url: site.domain },
  };
}

export default async function ProviderProfilePage({ params }: Props) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const provider = await loadProvider(id);
  if (!provider) notFound();

  const [content, ratings, jobs, articles, trust] = await Promise.all([
    getLiveContent(locale),
    listRatings(provider.id, { approvedOnly: true }),
    listLiveJobs().then((all) => all.filter((job) => job.providerId === provider.id)),
    listPublished().then((all) => all.filter((a) => a.providerId === provider.id).slice(0, 4)),
    scoreProvider(provider).catch(() => null),
  ]);

  const copy = PROFILE_COPY[locale];
  const average = averageRating(provider);
  const description = locale === "en" ? provider.descriptionEn : provider.descriptionEs;
  const category = PROVIDER_CATEGORY_LABELS[provider.category][locale];
  const directoryPath = locale === "en" ? "/en/directory" : "/es/directorio";
  const jobsPath = locale === "en" ? "/en/jobs" : "/es/empleos";
  const monogram = provider.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CR", { month: "long", year: "numeric" });
  const reviewFmt = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CR", { dateStyle: "medium" });
  const [mrz1, mrz2] = mrz(provider);
  const ld = JSON.stringify(localBusinessLd(provider, locale)).replace(/</g, "\\u003c");

  const fields: [string, string][] = [
    ...(provider.verified && trust
      ? ([[locale === "en" ? "Trust score" : "Puntaje de confianza", `${trust.total} / 100`]] as [string, string][])
      : []),
    [copy.rating, average ? `${average.toFixed(1)} / 5 · ${copy.verifiedReviews(provider.ratingsCount)}` : copy.noReviews],
    [
      copy.replies,
      provider.responseHoursMedian !== null && provider.responseSample > 0
        ? copy.repliesWithin(provider.responseHoursMedian)
        : copy.repliesUnknown,
    ],
    [copy.memberSince, provider.memberSince ? dateFmt.format(provider.memberSince) : "—"],
    ...(provider.location ? ([[locale === "en" ? "Based in" : "Ubicación", provider.location]] as [string, string][]) : []),
    ...(provider.languages.length
      ? ([
          [
            locale === "en" ? "Languages" : "Idiomas",
            provider.languages
              .map((code) => new Intl.DisplayNames([locale], { type: "language" }).of(code) ?? code)
              .map((n) => n.charAt(0).toUpperCase() + n.slice(1))
              .join(" · "),
          ],
        ] as [string, string][])
      : []),
  ];

  return (
    <article className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />

      <div className={styles.inner}>
        <Link href={directoryPath} className={styles.back}>
          ← {copy.back}
        </Link>
      </div>

      <div className={`${styles.inner} ${styles.layout}`}>
        <div className={styles.main}>
          {/* Passport data page */}
          <section className={styles.passport} aria-labelledby="provider-name">
            <div className={styles.photo} aria-hidden="true">
              {provider.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={provider.logoUrl} alt="" />
              ) : (
                <span>{monogram}</span>
              )}
            </div>
            <div className={styles.data}>
              <p className={styles.kind}>
                <span>{category}</span>
                <span aria-hidden="true">CRI</span>
              </p>
              <h1 id="provider-name" className={styles.name}>
                <span className="lineMask">
                  <span>{provider.name}</span>
                </span>
              </h1>
              <dl className={styles.fields}>
                {fields.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            {provider.verified ? (
              <Seal
                id={`profile-${provider.id}`}
                size="md"
                spin={false}
                className={styles.stamp}
                label={locale === "en" ? "Verified by CR-CIPI" : "Verificado por CR-CIPI"}
              />
            ) : null}
            <p className={styles.mrz} aria-hidden="true">
              <span>{mrz1}</span>
              <span>{mrz2}</span>
            </p>
          </section>

          <section className={styles.section} aria-labelledby="about">
            <h2 id="about" className={styles.h2}>{copy.about}</h2>
            <RichText text={description} className={styles.prose} />
            {provider.website ? (
              <a className={styles.site} href={provider.website} target="_blank" rel="noopener noreferrer">
                {copy.website} <span aria-hidden="true">↗</span>
              </a>
            ) : null}
          </section>

          <section className={styles.section} aria-labelledby="seal">
            <h2 id="seal" className={styles.h2}>{copy.sealHeading}</h2>
            {provider.verified ? (
              <ol className={styles.checks}>
                {copy.sealItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            ) : (
              <p className={styles.caution}>{copy.notVerified}</p>
            )}
          </section>

          <section className={styles.section} aria-labelledby="reviews">
            <div className={styles.sectionHead}>
              <h2 id="reviews" className={styles.h2}>{copy.reviewsHeading}</h2>
              <ProfileReviewButton
                providerId={provider.id}
                providerName={provider.name}
                label={copy.leaveReview}
                copy={content.directory.rating}
              />
            </div>
            {ratings.length === 0 ? (
              <p className={styles.empty}>{copy.noReviews}</p>
            ) : (
              <ul className={styles.reviews}>
                {ratings.slice(0, 12).map((review) => (
                  <li key={review.id}>
                    <p className={styles.stars} aria-label={`${review.rating} / 5`}>
                      {"★".repeat(review.rating)}
                      <span aria-hidden="true">{"★".repeat(5 - review.rating)}</span>
                    </p>
                    {review.comment ? <blockquote>{review.comment}</blockquote> : null}
                    <p className={styles.reviewer}>
                      {review.reviewerName} · {reviewFmt.format(review.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {articles.length > 0 ? (
            <section className={styles.section} aria-labelledby="guides">
              <h2 id="guides" className={styles.h2}>{copy.articlesHeading}</h2>
              <ul className={styles.links}>
                {articles.map((article) => (
                  <li key={article.id}>
                    <Link href={`/${article.language}/blog/${article.slug}`}>
                      <span>{article.title}</span>
                      <span className={styles.linkMeta}>{article.readingMinutes} min</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {jobs.length > 0 ? (
            <section className={styles.section} aria-labelledby="roles">
              <h2 id="roles" className={styles.h2}>{copy.jobsHeading}</h2>
              <ul className={styles.links}>
                {jobs.map((job) => (
                  <li key={job.id}>
                    <Link href={`${jobsPath}/${job.id}`}>
                      <span>{job.title}</span>
                      <span className={styles.linkMeta}>{job.location}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className={styles.aside} id="contact" aria-label={copy.contact}>
          <ContactForm
            providerId={provider.id}
            providerName={provider.name}
            locale={locale}
            privacyHref={locale === "en" ? "/en/privacy" : "/es/privacidad"}
          />
          <a className={styles.report} href={`mailto:${site.contactEmail}?subject=${encodeURIComponent(`Member report: ${provider.name}`)}`}>
            {copy.report}
          </a>
        </aside>
      </div>
    </article>
  );
}
