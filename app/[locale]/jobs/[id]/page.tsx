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
import styles from "./page.module.scss";

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

  const destination = job.location || WORK_MODE_LABELS[job.workMode][locale];
  const facts: [string, string][] = [
    [copy.detail.location, destination],
    [copy.detail.type, EMPLOYMENT_TYPE_LABELS[job.employmentType][locale]],
    [copy.detail.mode, WORK_MODE_LABELS[job.workMode][locale]],
    ...(salary ? ([[copy.detail.salary, salary]] as [string, string][]) : []),
    ...(job.expiresAt ? ([[copy.detail.expires, dateFmt.format(job.expiresAt)]] as [string, string][]) : []),
  ];

  return (
    <article className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />
      <header className={styles.head}>
        <div className={styles.inner}>
          <Link href={locale === "en" ? "/en/jobs" : "/es/empleos"} className={styles.back}>
            ← {copy.detail.back}
          </Link>
          <p className="eyebrow">
            <Link href={`${directoryPath}/${provider.id}`} className={styles.company}>
              {provider.name}
            </Link>
            {provider.verified ? <span className={styles.verified}>✓ {copy.detail.verified}</span> : null}
          </p>
          <h1 className={styles.title}>
            <span className="lineMask">
              <span>{job.title}</span>
            </span>
          </h1>
          <dl className={styles.ticket}>
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <div className={`${styles.inner} ${styles.body}`}>
        <div className={styles.copy}>
          <h2 className={styles.h2}>{copy.detail.about}</h2>
          <RichText text={job.description} className={styles.prose} />
          {job.requirements ? (
            <>
              <h2 className={styles.h2}>{copy.detail.requirements}</h2>
              <RichText text={job.requirements} className={styles.prose} />
            </>
          ) : null}
          <p className={styles.posted}>
            {site.name} · {copy.board.posted} {dateFmt.format(job.publishedAt ?? job.createdAt)}
          </p>
        </div>
        <JobApplyForm
          jobId={job.id}
          locale={locale}
          copy={copy.apply}
          privacyLabel={content.nav.privacy}
          pass={{ role: job.title, company: provider.name, destination }}
        />
      </div>
    </article>
  );
}
