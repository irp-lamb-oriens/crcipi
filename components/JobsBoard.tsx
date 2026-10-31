"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { JobsContent, Locale } from "@/content/types";
import {
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  WORK_MODES,
  WORK_MODE_LABELS,
  type EmploymentType,
  type WorkMode,
} from "@/lib/jobOptions";
import styles from "./Listing.module.scss";

export interface BoardJob {
  id: string;
  title: string;
  company: string;
  verified: boolean;
  location: string;
  employmentType: EmploymentType;
  workMode: WorkMode;
  salary: string | null;
  publishedAt: number;
}

export default function JobsBoard({
  locale,
  jobs,
  copy,
}: {
  locale: Locale;
  jobs: BoardJob[];
  copy: JobsContent;
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<EmploymentType | "all">("all");
  const [mode, setMode] = useState<WorkMode | "all">("all");
  const base = locale === "en" ? "/en/jobs" : "/es/empleos";
  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CR", {
    month: "short",
    day: "numeric",
  });

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter(
      (job) =>
        (type === "all" || job.employmentType === type) &&
        (mode === "all" || job.workMode === mode) &&
        (!q || `${job.title} ${job.company} ${job.location}`.toLowerCase().includes(q))
    );
  }, [jobs, query, type, mode]);

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.toolbar}>
          <label className={styles.srOnly} htmlFor="job-search">{copy.board.search}</label>
          <input id="job-search" type="search" className={styles.search} value={query}
            placeholder={copy.board.searchPlaceholder} onChange={(e) => setQuery(e.target.value)} />
          <select aria-label={copy.board.allTypes} className={styles.select} value={type}
            onChange={(e) => setType(e.target.value as EmploymentType | "all")}>
            <option value="all">{copy.board.allTypes}</option>
            {EMPLOYMENT_TYPES.map((t) => (
              <option key={t} value={t}>{EMPLOYMENT_TYPE_LABELS[t][locale]}</option>
            ))}
          </select>
          <select aria-label={copy.board.allModes} className={styles.select} value={mode}
            onChange={(e) => setMode(e.target.value as WorkMode | "all")}>
            <option value="all">{copy.board.allModes}</option>
            {WORK_MODES.map((m) => (
              <option key={m} value={m}>{WORK_MODE_LABELS[m][locale]}</option>
            ))}
          </select>
        </div>

        {visible.length === 0 ? (
          <p className={styles.empty}>{copy.board.empty}</p>
        ) : (
          <ul className={styles.rows}>
            {visible.map((job) => (
              <li key={job.id} className={styles.rowItem}>
                <Link href={`${base}/${job.id}`} className={styles.rowLink}>
                  <div>
                    <h2 className={styles.rowTitle}>{job.title}</h2>
                    <div className={styles.rowMeta}>
                      <strong>{job.company}</strong>
                      {job.verified ? (
                        <span className={`${styles.tag} ${styles.tagVerified}`}>✓ {copy.detail.verified}</span>
                      ) : null}
                      <span>{job.location || WORK_MODE_LABELS[job.workMode][locale]}</span>
                      <span>{EMPLOYMENT_TYPE_LABELS[job.employmentType][locale]}</span>
                      <span>{WORK_MODE_LABELS[job.workMode][locale]}</span>
                      {job.salary ? <span>{job.salary}</span> : null}
                      <span>{copy.board.posted} {dateFmt.format(job.publishedAt)}</span>
                    </div>
                  </div>
                  <span className={styles.rowCta}>{copy.board.view} →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <aside className={styles.promo}>
          <div>
            <h2>{copy.board.postHeading}</h2>
            <p>{copy.board.postBody}</p>
          </div>
          <Link href="/account/jobs" className="btn btn--primary">{copy.board.postCta}</Link>
        </aside>
      </div>
    </section>
  );
}
