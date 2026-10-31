import type { Locale } from "@/content/types";

// Client-safe job-board vocabulary shared by the public board, the member
// console and the server validator.

export const EMPLOYMENT_TYPES = ["full-time", "part-time", "contract", "temporary", "internship"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const WORK_MODES = ["onsite", "hybrid", "remote"] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const JOB_STATUSES = ["draft", "published", "closed", "removed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const SALARY_CURRENCIES = ["USD", "CRC"] as const;
export type SalaryCurrency = (typeof SALARY_CURRENCIES)[number];

export const SALARY_PERIODS = ["hour", "month", "year"] as const;
export type SalaryPeriod = (typeof SALARY_PERIODS)[number];

export const APPLICATION_STATUSES = ["new", "reviewed", "shortlisted", "rejected", "hired"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

// How long a published posting stays on the public board before it expires.
export const JOB_TTL_DAYS = 60;

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, Record<Locale, string>> = {
  "full-time": { en: "Full-time", es: "Tiempo completo" },
  "part-time": { en: "Part-time", es: "Medio tiempo" },
  contract: { en: "Contract", es: "Por contrato" },
  temporary: { en: "Temporary", es: "Temporal" },
  internship: { en: "Internship", es: "Pasantía" },
};

export const WORK_MODE_LABELS: Record<WorkMode, Record<Locale, string>> = {
  onsite: { en: "On-site", es: "Presencial" },
  hybrid: { en: "Hybrid", es: "Híbrido" },
  remote: { en: "Remote", es: "Remoto" },
};

const PERIOD_LABELS: Record<SalaryPeriod, Record<Locale, string>> = {
  hour: { en: "hour", es: "hora" },
  month: { en: "month", es: "mes" },
  year: { en: "year", es: "año" },
};

export function formatSalary(
  job: {
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurrency: SalaryCurrency;
    salaryPeriod: SalaryPeriod;
  },
  locale: Locale
): string | null {
  if (job.salaryMin === null && job.salaryMax === null) return null;
  const fmt = new Intl.NumberFormat(locale === "en" ? "en-US" : "es-CR", {
    style: "currency",
    currency: job.salaryCurrency,
    maximumFractionDigits: 0,
  });
  const range =
    job.salaryMin !== null && job.salaryMax !== null
      ? `${fmt.format(job.salaryMin)} – ${fmt.format(job.salaryMax)}`
      : fmt.format((job.salaryMin ?? job.salaryMax)!);
  return `${range} / ${PERIOD_LABELS[job.salaryPeriod][locale]}`;
}
