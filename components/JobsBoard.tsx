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
import styles from "./JobsBoard.module.scss";

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
  expiresAt: number | null;
}

const DAY = 24 * 60 * 60 * 1000;

const BOARD: Record<Locale, { title: string; posted: string; role: string; destination: string; type: string; status: string; new: string; open: string; closing: string; count: (n: number) => string }> = {
  en: {
    title: "Departures",
    posted: "Posted",
    role: "Role · Company",
    destination: "Destination",
    type: "Type",
    status: "Status",
    new: "New",
    open: "Open",
    closing: "Last call",
    count: (n) => `${n} ${n === 1 ? "opening" : "openings"}`,
  },
  es: {
    title: "Salidas",
    posted: "Publicado",
    role: "Puesto · Empresa",
    destination: "Destino",
    type: "Tipo",
    status: "Estado",
    new: "Nuevo",
    open: "Abierto",
    closing: "Última llamada",
    count: (n) => `${n} ${n === 1 ? "vacante" : "vacantes"}`,
  },
};

// The job board as an airport departures board: people are arriving in
// Costa Rica, and these are the roles that take them there. Rows flip in
// once on load (static under reduced motion); every row is one link.
export default function JobsBoard({ locale, jobs, copy }: { locale: Locale; jobs: BoardJob[]; copy: JobsContent }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<EmploymentType | "all">("all");
  const [mode, setMode] = useState<WorkMode | "all">("all");
  const t = BOARD[locale];
  const base = locale === "en" ? "/en/jobs" : "/es/empleos";
  const date = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CR", { day: "2-digit", month: "short" });
  const now = Date.now();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter(
      (job) =>
        (type === "all" || job.employmentType === type) &&
        (mode === "all" || job.workMode === mode) &&
        (!q || `${job.title} ${job.company} ${job.location}`.toLowerCase().includes(q))
    );
  }, [jobs, query, type, mode]);

  function status(job: BoardJob) {
    if (job.expiresAt && job.expiresAt - now < 7 * DAY) return { label: t.closing, tone: styles.closing };
    if (now - job.publishedAt < 7 * DAY) return { label: t.new, tone: styles.fresh };
    return { label: t.open, tone: "" };
  }

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.controls}>
          <label className={styles.searchLabel} htmlFor="job-search">
            <span className="srOnly">{copy.board.search}</span>
            <input
              id="job-search"
              type="search"
              className={styles.search}
              value={query}
              placeholder={copy.board.searchPlaceholder}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select aria-label={copy.board.allTypes} className={styles.select} value={type} onChange={(e) => setType(e.target.value as EmploymentType | "all")}>
            <option value="all">{copy.board.allTypes}</option>
            {EMPLOYMENT_TYPES.map((value) => (
              <option key={value} value={value}>
                {EMPLOYMENT_TYPE_LABELS[value][locale]}
              </option>
            ))}
          </select>
          <select aria-label={copy.board.allModes} className={styles.select} value={mode} onChange={(e) => setMode(e.target.value as WorkMode | "all")}>
            <option value="all">{copy.board.allModes}</option>
            {WORK_MODES.map((value) => (
              <option key={value} value={value}>
                {WORK_MODE_LABELS[value][locale]}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.board}>
          <div className={styles.boardHead}>
            <h2 className={styles.boardTitle}>
              <span aria-hidden="true">✈︎</span> {t.title}
            </h2>
            <p className={styles.boardCount} aria-live="polite">
              {t.count(visible.length)}
            </p>
          </div>

          {visible.length === 0 ? (
            <p className={styles.empty}>{copy.board.empty}</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">{t.posted}</th>
                  <th scope="col">{t.role}</th>
                  <th scope="col">{t.destination}</th>
                  <th scope="col">{t.type}</th>
                  <th scope="col">{t.status}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((job, i) => {
                  const s = status(job);
                  return (
                    <tr key={job.id} style={{ "--i": i } as React.CSSProperties}>
                      <td className={styles.time}>{date.format(job.publishedAt)}</td>
                      <td className={styles.role}>
                        <Link href={`${base}/${job.id}`} className={styles.rowLink}>
                          <span className={styles.title}>{job.title}</span>
                          <span className={styles.company}>
                            {job.company}
                            {job.verified ? <span className={styles.verified}> ✓ {copy.detail.verified}</span> : null}
                          </span>
                        </Link>
                      </td>
                      <td className={styles.dest}>{job.location || WORK_MODE_LABELS[job.workMode][locale]}</td>
                      <td className={styles.type}>
                        {EMPLOYMENT_TYPE_LABELS[job.employmentType][locale]}
                        <span>{WORK_MODE_LABELS[job.workMode][locale]}</span>
                        {job.salary ? <span>{job.salary}</span> : null}
                      </td>
                      <td>
                        <span className={`${styles.status} ${s.tone}`}>{s.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <aside className={styles.promo}>
          <div>
            <h2 className={styles.promoTitle}>{copy.board.postHeading}</h2>
            <p>{copy.board.postBody}</p>
          </div>
          <Link href="/account/jobs" className="btn btn--ghost">
            {copy.board.postCta}
            <span className="btn__arrow" aria-hidden="true">→</span>
          </Link>
        </aside>
      </div>
    </section>
  );
}
