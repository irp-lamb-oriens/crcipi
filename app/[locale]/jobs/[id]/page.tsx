import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { isLocale } from "@/content";
import { site } from "@/content/site";
import { getLiveContent } from "@/lib/contentStore";
import { buildPageMetadata } from "@/lib/metadata";
import { EMPLOYMENT_TYPE_LABELS, WORK_MODE_LABELS, formatSalary } from "@/lib/jobOptions";
import { getJob, isLive, recordJobView, type Job } from "@/lib/jobs";
import { getProvider } from "@/lib/providers";
import { recordEvent } from "@/lib/stats";
import JobApplyForm from "@/components/JobApplyForm";
import RichText from "@/components/RichText";
import styles from "@/components/Listing.module.scss";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

async function loadLiveJob(id: string) {
  const job = await getJob(id);
  if (!job || !isLive(job)) return null;
  const provider = await getProvider(job.providerId);
  if (!provider || !provider.approved) return null;
  return { job, provider };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isLocale(locale)) return {};
  const found = await loadLiveJob(id);
  if (!found) return {};
  return buildPageMetadata({
    path: `${locale === "en" ? "/en/jobs" : "/es/empleos"}/${id}`,
    alternatives: { en: `/en/jobs/${id}`, es: `/es/empleos/${id}` },
    title: `${found.job.title} · ${found.provider.name} | CR-CIPI`,
    description: found.job.description.slice(0, 155),
  });
}

// schema.org JobPosting so the role can appear in Google's job search.
function jobPostingLd(job: Job, companyName: string, website?: string) {
  const types: Record<Job["employmentType"], string> = {
    "full-time": "FULL_TIME",
    "part-time": "PART_TIME",
    contract: "CONTRACTOR",
    temporary: "TEMPORARY",
    internship: "INTERN",
  };
  const units = { hour: "HOUR", month: "MONTH", year: "YEAR" } as const;
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: [job.description, job.requirements].filter(Boolean).join("\n\n"),
    datePosted: new Date(job.publishedAt ?? job.createdAt).toISOString(),
    validThrough: job.expiresAt ? new Date(job.expiresAt).toISOString() : undefined,
    employmentType: types[job.employmentType],
    hiringOrganization: { "@type": "Organization", name: companyName, sameAs: website },
    ...(job.workMode === "remote"
      ? { jobLocationType: "TELECOMMUTE", applicantLocationRequirements: { "@type": "Country", name: "Costa Rica" } }
      : {
          jobLocation: {
            "@type": "Place",
            address: { "@type": "PostalAddress", addressLocality: job.location, addressCountry: "CR" },
          },
        }),
    ...(job.salaryMin !== null || job.salaryMax !== null
      ? {
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: job.salaryCurrency,
            value: {
              "@type": "QuantitativeValue",
              minValue: job.salaryMin ?? undefined,
              maxValue: job.salaryMax ?? undefined,
              unitText: units[job.salaryPeriod],
            },
          },
        }
      : {}),
  };
}

export default async function JobDetailPage({ params }: Props) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const [content, found] = await Promise.all([getLiveContent(locale), loadLiveJob(id)]);
  if (!found) notFound();
  const { job, provider } = found;
  const copy = content.jobs;

  recordJobView(job.id);
  recordEvent("job_view");

  const salary = formatSalary(job, locale);
  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CR", { dateStyle: "long" });
  const directoryPath = locale === "en" ? "/en/directory" : "/es/directorio";
  // Escape "<" so the JSON-LD can never close its own script tag.
  const ld = JSON.stringify(jobPostingLd(job, provider.name, provider.website)).replace(/</g, "\\u003c");

  return (
    <section className={styles.section}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />
      <div className={styles.inner}>
        <Link href={locale === "en" ? "/en/jobs" : "/es/empleos"} className={styles.back}>
          ← {copy.detail.back}
        </Link>
        <div className={styles.detailGrid}>
          <article>
            <p className={styles.eyebrow}>{provider.name}</p>
            <h1 className={styles.rowTitle} style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)", textTransform: "uppercase" }}>
              {job.title}
            </h1>
            <dl className={styles.facts} style={{ marginTop: "1.5rem" }}>
              <dt>{copy.detail.company}</dt>
              <dd>
                <Link href={directoryPath}>{provider.name}</Link>
                {provider.verified ? (
                  <span className={`${styles.tag} ${styles.tagVerified}`} style={{ marginLeft: "0.5rem" }}>
                    ✓ {copy.detail.verified}
                  </span>
                ) : null}
              </dd>
              <dt>{copy.detail.location}</dt>
              <dd>{job.location || WORK_MODE_LABELS[job.workMode][locale]}</dd>
              <dt>{copy.detail.type}</dt>
              <dd>{EMPLOYMENT_TYPE_LABELS[job.employmentType][locale]}</dd>
              <dt>{copy.detail.mode}</dt>
              <dd>{WORK_MODE_LABELS[job.workMode][locale]}</dd>
              {salary ? (
                <>
                  <dt>{copy.detail.salary}</dt>
                  <dd>{salary}</dd>
                </>
              ) : null}
              {job.expiresAt ? (
                <>
                  <dt>{copy.detail.expires}</dt>
                  <dd>{dateFmt.format(job.expiresAt)}</dd>
                </>
              ) : null}
            </dl>

            <h2 className={styles.h2}>{copy.detail.about}</h2>
            <RichText text={job.description} className={styles.prose} />
            {job.requirements ? (
              <>
                <h2 className={styles.h2}>{copy.detail.requirements}</h2>
                <RichText text={job.requirements} className={styles.prose} />
              </>
            ) : null}
            <p className={styles.hint}>
              {site.name} · {copy.board.posted} {dateFmt.format(job.publishedAt ?? job.createdAt)}
            </p>
          </article>

          <JobApplyForm jobId={job.id} locale={locale} copy={copy.apply} />
        </div>
      </div>
    </section>
  );
}
