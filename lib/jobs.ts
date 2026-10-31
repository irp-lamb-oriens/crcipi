import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";
import { withoutUndefined } from "@/lib/firestoreData";
import {
  APPLICATION_STATUSES,
  EMPLOYMENT_TYPES,
  JOB_STATUSES,
  JOB_TTL_DAYS,
  SALARY_CURRENCIES,
  SALARY_PERIODS,
  WORK_MODES,
  type ApplicationStatus,
  type EmploymentType,
  type JobStatus,
  type SalaryCurrency,
  type SalaryPeriod,
  type WorkMode,
} from "@/lib/jobOptions";
import type { StoredFile } from "@/lib/storage";

// ============================================================
// Member job board (bolsa de empleo).
//
//   jobs/{jobId}                        -> Job
//   jobs/{jobId}/applications/{appId}   -> JobApplication
//
// A job always belongs to one of the poster's providers (providerId) and to
// the poster (ownerId); every member mutation re-checks ownerId. Views and
// applications are counted on the job document for the employer's funnel.
// Applicant data (incl. the CV path) is readable only by the job owner and
// admins with `jobs.manage`.
// ============================================================

const DAY_MS = 24 * 60 * 60 * 1000;

export interface Job {
  id: string;
  providerId: string;
  providerName: string;
  ownerId: string;
  title: string;
  employmentType: EmploymentType;
  workMode: WorkMode;
  location: string;
  description: string;
  requirements: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: SalaryCurrency;
  salaryPeriod: SalaryPeriod;
  applyEmail: string;
  status: JobStatus;
  createdAt: number;
  updatedAt: number;
  publishedAt: number | null;
  expiresAt: number | null;
  viewsCount: number;
  applicationsCount: number;
}

export interface JobApplication {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  linkedin: string | null;
  message: string;
  cv: StoredFile | null;
  status: ApplicationStatus;
  createdAt: number;
}

function jobsCol() {
  return db.collection("jobs");
}

function applicationsCol(jobId: string) {
  return jobsCol().doc(jobId).collection("applications");
}

function pick<T extends string>(list: readonly T[], value: unknown, fallback: T): T {
  return (list as readonly unknown[]).includes(value) ? (value as T) : fallback;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toJob(id: string, d: Record<string, unknown>): Job {
  return {
    id,
    providerId: String(d.providerId ?? ""),
    providerName: String(d.providerName ?? ""),
    ownerId: String(d.ownerId ?? ""),
    title: String(d.title ?? ""),
    employmentType: pick(EMPLOYMENT_TYPES, d.employmentType, "full-time"),
    workMode: pick(WORK_MODES, d.workMode, "onsite"),
    location: String(d.location ?? ""),
    description: String(d.description ?? ""),
    requirements: String(d.requirements ?? ""),
    salaryMin: num(d.salaryMin),
    salaryMax: num(d.salaryMax),
    salaryCurrency: pick(SALARY_CURRENCIES, d.salaryCurrency, "USD"),
    salaryPeriod: pick(SALARY_PERIODS, d.salaryPeriod, "month"),
    applyEmail: String(d.applyEmail ?? ""),
    status: pick(JOB_STATUSES, d.status, "draft"),
    createdAt: Number(d.createdAt ?? 0),
    updatedAt: Number(d.updatedAt ?? 0),
    publishedAt: num(d.publishedAt),
    expiresAt: num(d.expiresAt),
    viewsCount: Number(d.viewsCount ?? 0),
    applicationsCount: Number(d.applicationsCount ?? 0),
  };
}

function toApplication(id: string, d: Record<string, unknown>): JobApplication {
  return {
    id,
    name: String(d.name ?? ""),
    email: String(d.email ?? ""),
    phone: d.phone ? String(d.phone) : null,
    linkedin: d.linkedin ? String(d.linkedin) : null,
    message: String(d.message ?? ""),
    cv: d.cv && typeof d.cv === "object" ? (d.cv as StoredFile) : null,
    status: pick(APPLICATION_STATUSES, d.status, "new"),
    createdAt: Number(d.createdAt ?? 0),
  };
}

export function isLive(job: Job, now = Date.now()): boolean {
  return job.status === "published" && (job.expiresAt === null || job.expiresAt > now);
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getJob(id: string): Promise<Job | null> {
  const snap = await jobsCol().doc(id).get();
  return snap.exists ? toJob(id, snap.data() as Record<string, unknown>) : null;
}

// Single-field queries only, so no composite index is needed; sorting happens
// in memory (the board is small).
export async function listLiveJobs(): Promise<Job[]> {
  const snap = await jobsCol().where("status", "==", "published").get();
  const now = Date.now();
  return snap.docs
    .map((doc) => toJob(doc.id, doc.data() as Record<string, unknown>))
    .filter((job) => isLive(job, now))
    .sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
}

export async function listJobsByOwner(ownerId: string): Promise<Job[]> {
  const snap = await jobsCol().where("ownerId", "==", ownerId).get();
  return snap.docs
    .map((doc) => toJob(doc.id, doc.data() as Record<string, unknown>))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function listAllJobs(): Promise<Job[]> {
  const snap = await jobsCol().get();
  return snap.docs
    .map((doc) => toJob(doc.id, doc.data() as Record<string, unknown>))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function listApplications(jobId: string): Promise<JobApplication[]> {
  const snap = await applicationsCol(jobId).orderBy("createdAt", "desc").get();
  return snap.docs.map((doc) => toApplication(doc.id, doc.data() as Record<string, unknown>));
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface JobInput {
  providerId: string;
  title: string;
  employmentType: EmploymentType;
  workMode: WorkMode;
  location: string;
  description: string;
  requirements: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: SalaryCurrency;
  salaryPeriod: SalaryPeriod;
  applyEmail: string;
  status: "draft" | "published" | "closed";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function money(value: unknown): number | null | "invalid" {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n < 1e10 ? Math.round(n) : "invalid";
}

export function validateJobInput(
  raw: unknown
): { ok: true; data: JobInput } | { ok: false; errors: Record<string, string> } {
  const body = (raw ?? {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const providerId = text(body.providerId, 100);
  const title = text(body.title, 140);
  const location = text(body.location, 140);
  const description = text(body.description, 8000);
  const requirements = text(body.requirements, 4000);
  const applyEmail = text(body.applyEmail, 254).toLowerCase();
  const salaryMin = money(body.salaryMin);
  const salaryMax = money(body.salaryMax);
  const status = pick(["draft", "published", "closed"] as const, body.status, "draft");

  if (!providerId) errors.providerId = "required";
  if (!title) errors.title = "required";
  if (description.length < 80) errors.description = "too_short";
  if (!location && body.workMode !== "remote") errors.location = "required";
  if (!EMAIL_RE.test(applyEmail)) errors.applyEmail = "invalid";
  if (salaryMin === "invalid") errors.salaryMin = "invalid";
  if (salaryMax === "invalid") errors.salaryMax = "invalid";
  if (typeof salaryMin === "number" && typeof salaryMax === "number" && salaryMin > salaryMax) {
    errors.salaryMax = "below_min";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      providerId,
      title,
      employmentType: pick(EMPLOYMENT_TYPES, body.employmentType, "full-time"),
      workMode: pick(WORK_MODES, body.workMode, "onsite"),
      location,
      description,
      requirements,
      salaryMin: salaryMin as number | null,
      salaryMax: salaryMax as number | null,
      salaryCurrency: pick(SALARY_CURRENCIES, body.salaryCurrency, "USD"),
      salaryPeriod: pick(SALARY_PERIODS, body.salaryPeriod, "month"),
      applyEmail,
      status,
    },
  };
}

export interface ApplicationInput {
  name: string;
  email: string;
  phone: string | null;
  linkedin: string | null;
  message: string;
}

export function validateApplication(
  raw: Record<string, unknown>
): { ok: true; data: ApplicationInput } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const name = text(raw.name, 120);
  const email = text(raw.email, 254).toLowerCase();
  const phone = text(raw.phone, 40);
  let linkedin = text(raw.linkedin, 300);
  const message = text(raw.message, 4000);

  if (!name) errors.name = "required";
  if (!EMAIL_RE.test(email)) errors.email = "invalid";
  if (linkedin && !/^https?:\/\//i.test(linkedin)) linkedin = `https://${linkedin}`;
  if (message.length < 20) errors.message = "too_short";
  if (raw.consent !== "true" && raw.consent !== true) errors.consent = "required";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { name, email, phone: phone || null, linkedin: linkedin || null, message } };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

// Publishing (first time, or re-publishing a closed/expired post) restarts the
// expiry clock.
function publishFields(next: JobStatus, previous: Job | null, now: number) {
  if (next !== "published") return {};
  if (previous && isLive(previous, now)) return {};
  return { publishedAt: now, expiresAt: now + JOB_TTL_DAYS * DAY_MS };
}

export async function createJob(
  input: JobInput,
  owner: { ownerId: string; providerName: string }
): Promise<Job> {
  const ref = jobsCol().doc();
  const now = Date.now();
  const data = {
    ...input,
    ownerId: owner.ownerId,
    providerName: owner.providerName,
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
    expiresAt: null,
    viewsCount: 0,
    applicationsCount: 0,
    ...publishFields(input.status, null, now),
  };
  await ref.set(data);
  return toJob(ref.id, data);
}

export async function updateJob(
  previous: Job,
  input: Partial<Omit<JobInput, "status">> & { providerName?: string; status?: JobStatus }
): Promise<void> {
  const now = Date.now();
  await jobsCol()
    .doc(previous.id)
    .set(
      withoutUndefined({
        ...input,
        updatedAt: now,
        ...(input.status ? publishFields(input.status, previous, now) : {}),
      }),
      { merge: true }
    );
}

export async function deleteJob(id: string): Promise<string[]> {
  // Returns CV paths so the caller can remove the files too.
  const apps = await applicationsCol(id).get();
  const cvPaths = apps.docs
    .map((doc) => (doc.data().cv as StoredFile | undefined)?.path)
    .filter((path): path is string => !!path);
  const batch = db.batch();
  apps.docs.forEach((doc) => batch.delete(doc.ref));
  batch.delete(jobsCol().doc(id));
  await batch.commit();
  return cvPaths;
}

export function recordJobView(id: string): void {
  void jobsCol()
    .doc(id)
    .update({ viewsCount: FieldValue.increment(1) })
    .catch(() => {});
}

export async function addApplication(
  jobId: string,
  input: ApplicationInput,
  cv: StoredFile | null
): Promise<JobApplication> {
  const ref = applicationsCol(jobId).doc();
  const data = { ...input, cv, status: "new" as const, createdAt: Date.now() };
  const batch = db.batch();
  batch.set(ref, data);
  batch.update(jobsCol().doc(jobId), { applicationsCount: FieldValue.increment(1) });
  await batch.commit();
  return toApplication(ref.id, data);
}

export async function setApplicationStatus(
  jobId: string,
  applicationId: string,
  status: ApplicationStatus
): Promise<boolean> {
  const ref = applicationsCol(jobId).doc(applicationId);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.update({ status, updatedAt: Date.now() });
  return true;
}
