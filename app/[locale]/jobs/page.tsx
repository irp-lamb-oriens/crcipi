import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/content";
import { getLiveContent } from "@/lib/contentStore";
import { buildPageMetadata } from "@/lib/metadata";
import { formatSalary } from "@/lib/jobOptions";
import { listLiveJobs } from "@/lib/jobs";
import { listProviders } from "@/lib/providers";
import PageHero from "@/components/PageHero";
import JobsBoard, { type BoardJob } from "@/components/JobsBoard";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const content = await getLiveContent(locale);
  return buildPageMetadata({
    path: locale === "en" ? "/en/jobs" : "/es/empleos",
    alternatives: { en: "/en/jobs", es: "/es/empleos" },
    title: content.jobs.meta.title,
    description: content.jobs.meta.description,
  });
}

export default async function JobsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [content, jobs, providers] = await Promise.all([
    getLiveContent(locale),
    listLiveJobs(),
    listProviders({ approvedOnly: true }),
  ]);
  const providerById = new Map(providers.map((p) => [p.id, p]));

  // A job is only shown while its company is listed in the directory.
  const items: BoardJob[] = jobs
    .filter((job) => providerById.has(job.providerId))
    .map((job) => ({
      id: job.id,
      title: job.title,
      company: providerById.get(job.providerId)!.name,
      verified: providerById.get(job.providerId)!.verified,
      location: job.location,
      employmentType: job.employmentType,
      workMode: job.workMode,
      salary: formatSalary(job, locale),
      publishedAt: job.publishedAt ?? job.createdAt,
      expiresAt: job.expiresAt,
    }));

  return (
    <>
      <PageHero
        pathPrefix="jobs.hero"
        eyebrow={content.jobs.hero.eyebrow}
        heading={content.jobs.hero.heading}
        body={content.jobs.hero.body}
      />
      <JobsBoard locale={locale} jobs={items} copy={content.jobs} />
    </>
  );
}
