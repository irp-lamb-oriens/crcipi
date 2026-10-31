"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ConsoleGate from "@/components/console/ConsoleGate";
import ModuleGuide from "@/components/console/ModuleGuide";
import StatusBadge, { type BadgeTone } from "@/components/console/StatusBadge";
import { useSession } from "@/components/console/useSession";
import { formatDate } from "@/components/console/labels";
import styles from "@/components/console/Console.module.scss";
import {
  APPLICATION_STATUSES,
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  SALARY_CURRENCIES,
  SALARY_PERIODS,
  WORK_MODES,
  WORK_MODE_LABELS,
  type ApplicationStatus,
  type EmploymentType,
  type JobStatus,
  type SalaryCurrency,
  type SalaryPeriod,
  type WorkMode,
} from "@/lib/jobOptions";

type Job = {
  id: string;
  providerId: string;
  providerName: string;
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
  expiresAt: number | null;
  viewsCount: number;
  applicationsCount: number;
};

type Application = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  linkedin: string | null;
  message: string;
  cv: { name: string; url: string | null } | null;
  status: ApplicationStatus;
  createdAt: number;
};

type Provider = { id: string; name: string; approved: boolean };

type Form = {
  providerId: string;
  title: string;
  employmentType: EmploymentType;
  workMode: WorkMode;
  location: string;
  description: string;
  requirements: string;
  salaryMin: string;
  salaryMax: string;
  salaryCurrency: SalaryCurrency;
  salaryPeriod: SalaryPeriod;
  applyEmail: string;
};

const STATUS_TONE: Record<JobStatus, BadgeTone> = {
  draft: "warn",
  published: "good",
  closed: "neutral",
  removed: "bad",
};

const FIELD_ERRORS: Record<string, string> = {
  required: "Required.",
  too_short: "Write at least 80 characters so candidates understand the role.",
  invalid: "Check this value.",
  below_min: "Must be greater than the minimum.",
  not_yours: "Choose one of your businesses.",
  not_approved: "This business is hidden from the directory, so it can't post jobs.",
};

function isExpired(job: Job) {
  return job.status === "published" && job.expiresAt !== null && job.expiresAt < Date.now();
}

export default function MemberJobsPage() {
  const session = useSession();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [defaultEmail, setDefaultEmail] = useState("");
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [applicantsFor, setApplicantsFor] = useState<Job | null>(null);
  const [applicants, setApplicants] = useState<Application[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "notice" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    const [jobsRes, provRes] = await Promise.all([fetch("/api/member/jobs"), fetch("/api/member/providers")]);
    if (jobsRes.ok) {
      const data = await jobsRes.json();
      setJobs(data.jobs as Job[]);
      setDefaultEmail(data.defaultApplyEmail ?? "");
    }
    if (provRes.ok) setProviders(((await provRes.json()).providers ?? []) as Provider[]);
  }, []);

  useEffect(() => {
    if (session.status === "member") void load();
  }, [session.status, load]);

  const gate = <ConsoleGate session={session} role="member" />;
  if (session.status !== "member") return gate;

  function startNew() {
    setEditing("new");
    setErrors({});
    setMessage(null);
    setForm({
      providerId: providers.find((p) => p.approved)?.id ?? "",
      title: "",
      employmentType: "full-time",
      workMode: "onsite",
      location: "",
      description: "",
      requirements: "",
      salaryMin: "",
      salaryMax: "",
      salaryCurrency: "USD",
      salaryPeriod: "month",
      applyEmail: defaultEmail,
    });
  }

  function startEdit(job: Job) {
    setEditing(job.id);
    setErrors({});
    setMessage(null);
    setForm({
      providerId: job.providerId,
      title: job.title,
      employmentType: job.employmentType,
      workMode: job.workMode,
      location: job.location,
      description: job.description,
      requirements: job.requirements,
      salaryMin: job.salaryMin?.toString() ?? "",
      salaryMax: job.salaryMax?.toString() ?? "",
      salaryCurrency: job.salaryCurrency,
      salaryPeriod: job.salaryPeriod,
      applyEmail: job.applyEmail,
    });
  }

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function send(path: string, method: string, body?: unknown) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(path, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => null);
      return { ok: res.ok, data };
    } finally {
      setBusy(false);
    }
  }

  async function save(status: "draft" | "published") {
    if (!form || !editing) return;
    const payload = { ...form, status, salaryMin: form.salaryMin || null, salaryMax: form.salaryMax || null };
    const { ok, data } =
      editing === "new"
        ? await send("/api/member/jobs", "POST", payload)
        : await send(`/api/member/jobs/${editing}`, "PATCH", payload);
    if (!ok) {
      setErrors((data?.errors as Record<string, string>) ?? {});
      setMessage({ kind: "error", text: data?.errors ? "Some fields need attention." : "Save failed." });
      return;
    }
    setMessage({ kind: "notice", text: status === "published" ? "Published on the job board." : "Draft saved." });
    setEditing(null);
    setForm(null);
    void load();
  }

  async function setStatus(job: Job, status: "published" | "closed") {
    const { ok } = await send(`/api/member/jobs/${job.id}`, "PATCH", { status });
    setMessage(ok ? { kind: "notice", text: status === "closed" ? "Job closed." : "Job re-published for 60 days." } : { kind: "error", text: "Update failed." });
    void load();
  }

  async function remove(job: Job) {
    if (!window.confirm(`Delete "${job.title}" and all its applications? This cannot be undone.`)) return;
    const { ok } = await send(`/api/member/jobs/${job.id}`, "DELETE");
    if (ok && applicantsFor?.id === job.id) setApplicantsFor(null);
    void load();
  }

  async function openApplicants(job: Job) {
    setApplicantsFor(job);
    setApplicants(null);
    const res = await fetch(`/api/member/jobs/${job.id}/applications`);
    setApplicants(res.ok ? ((await res.json()).applications as Application[]) : []);
  }

  async function moveApplicant(app: Application, status: ApplicationStatus) {
    if (!applicantsFor) return;
    const { ok } = await send(`/api/member/jobs/${applicantsFor.id}/applications/${app.id}`, "PATCH", { status });
    if (ok) setApplicants((prev) => prev?.map((a) => (a.id === app.id ? { ...a, status } : a)) ?? prev);
  }

  const err = (key: string) =>
    errors[key] ? <p className={styles.fieldError}>{FIELD_ERRORS[errors[key]] ?? "Check this field."}</p> : null;
  const totals = (jobs ?? []).reduce(
    (acc, job) => ({ views: acc.views + job.viewsCount, apps: acc.apps + job.applicationsCount }),
    { views: 0, apps: 0 }
  );

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Job board</p>
            <h1 className={styles.title}>Your job posts</h1>
            <p className={styles.subtitle}>
              Postings stay live for 60 days on <Link href="/en/jobs">the public job board</Link>.
              Applications arrive by email and are collected here.
            </p>
          </div>
          <div className={styles.actions}>
            <ModuleGuide area="member" id="jobs" />
            <button type="button" className={styles.primary} onClick={startNew}
              disabled={providers.filter((p) => p.approved).length === 0}>
              + New job
            </button>
          </div>
        </header>

        {message ? <p className={styles[message.kind]}>{message.text}</p> : null}
        {providers.length === 0 && jobs !== null ? (
          <p className={styles.warn}>
            Add your business first; every job is published under one of your businesses.{" "}
            <Link href="/account/businesses">Add a business</Link>
          </p>
        ) : null}

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Live jobs</span>
            <span className={styles.statValue}>
              {(jobs ?? []).filter((j) => j.status === "published" && !isExpired(j)).length}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Views</span>
            <span className={styles.statValue}>{totals.views}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Applications</span>
            <span className={styles.statValue}>{totals.apps}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>View → apply</span>
            <span className={styles.statValue}>
              {totals.views ? `${Math.round((totals.apps / totals.views) * 1000) / 10}%` : "—"}
            </span>
          </div>
        </div>

        {form ? (
          <form className={`${styles.card} ${styles.form}`} onSubmit={(e) => { e.preventDefault(); void save("published"); }}>
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle}>{editing === "new" ? "New job" : "Edit job"}</h2>
              <button type="button" className={styles.small} onClick={() => { setEditing(null); setForm(null); }}>Cancel</button>
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="j-provider">Company</label>
                <select id="j-provider" className={styles.input} value={form.providerId}
                  onChange={(e) => set("providerId", e.target.value)}>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id} disabled={!p.approved}>{p.name}</option>
                  ))}
                </select>
                {err("providerId")}
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="j-title">Job title</label>
                <input id="j-title" className={styles.input} value={form.title} maxLength={140}
                  onChange={(e) => set("title", e.target.value)} />
                {err("title")}
              </div>
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="j-type">Type</label>
                <select id="j-type" className={styles.input} value={form.employmentType}
                  onChange={(e) => set("employmentType", e.target.value as EmploymentType)}>
                  {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{EMPLOYMENT_TYPE_LABELS[t].en}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="j-mode">Work mode</label>
                <select id="j-mode" className={styles.input} value={form.workMode}
                  onChange={(e) => set("workMode", e.target.value as WorkMode)}>
                  {WORK_MODES.map((m) => <option key={m} value={m}>{WORK_MODE_LABELS[m].en}</option>)}
                </select>
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="j-location">Location</label>
              <input id="j-location" className={styles.input} value={form.location} placeholder="e.g. Escazú, San José"
                onChange={(e) => set("location", e.target.value)} />
              {err("location")}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="j-desc">Description</label>
              <textarea id="j-desc" className={styles.input} rows={8} value={form.description}
                onChange={(e) => set("description", e.target.value)} />
              <span className={styles.help}>Plain text. Blank line = new paragraph, &quot;- &quot; = bullet, &quot;## &quot; = heading.</span>
              {err("description")}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="j-req">Requirements (optional)</label>
              <textarea id="j-req" className={styles.input} rows={5} value={form.requirements}
                onChange={(e) => set("requirements", e.target.value)} />
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="j-min">Salary from (optional)</label>
                <input id="j-min" className={styles.input} inputMode="numeric" value={form.salaryMin}
                  onChange={(e) => set("salaryMin", e.target.value.replace(/[^\d]/g, ""))} />
                {err("salaryMin")}
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="j-max">Salary to (optional)</label>
                <input id="j-max" className={styles.input} inputMode="numeric" value={form.salaryMax}
                  onChange={(e) => set("salaryMax", e.target.value.replace(/[^\d]/g, ""))} />
                {err("salaryMax")}
              </div>
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="j-cur">Currency</label>
                <select id="j-cur" className={styles.input} value={form.salaryCurrency}
                  onChange={(e) => set("salaryCurrency", e.target.value as SalaryCurrency)}>
                  {SALARY_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="j-per">Per</label>
                <select id="j-per" className={styles.input} value={form.salaryPeriod}
                  onChange={(e) => set("salaryPeriod", e.target.value as SalaryPeriod)}>
                  {SALARY_PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="j-email">Send applications to</label>
              <input id="j-email" type="email" className={styles.input} value={form.applyEmail}
                onChange={(e) => set("applyEmail", e.target.value)} />
              {err("applyEmail")}
            </div>
            <div className={styles.actions}>
              <button type="submit" className={styles.primary} disabled={busy}>Publish</button>
              <button type="button" className={styles.ghost} disabled={busy} onClick={() => void save("draft")}>Save draft</button>
            </div>
          </form>
        ) : null}

        <section className={styles.card}>
          <h2 className={styles.cardTitle} style={{ marginBottom: "1rem" }}>All posts</h2>
          {jobs === null ? (
            <p className={styles.hint}>Loading…</p>
          ) : jobs.length === 0 ? (
            <p className={styles.empty}>No job posts yet.</p>
          ) : (
            <ul className={styles.list}>
              {jobs.map((job) => (
                <li key={job.id} className={styles.row}>
                  <div className={styles.rowMain}>
                    <div className={styles.rowTitle}>
                      {job.title}
                      <StatusBadge tone={isExpired(job) ? "neutral" : STATUS_TONE[job.status]}>
                        {isExpired(job) ? "Expired" : job.status === "removed" ? "Removed by CR-CIPI" : job.status}
                      </StatusBadge>
                    </div>
                    <div className={styles.rowMeta}>
                      {job.providerName} · {job.viewsCount} views · {job.applicationsCount} applications
                      {job.expiresAt && job.status === "published" ? ` · until ${formatDate(job.expiresAt)}` : ""}
                    </div>
                  </div>
                  <div className={styles.rowActions}>
                    <button type="button" className={styles.small} onClick={() => void openApplicants(job)}>
                      Applicants ({job.applicationsCount})
                    </button>
                    {job.status !== "removed" ? (
                      <>
                        <button type="button" className={styles.small} onClick={() => startEdit(job)}>Edit</button>
                        {job.status === "published" && !isExpired(job) ? (
                          <button type="button" className={styles.small} disabled={busy} onClick={() => void setStatus(job, "closed")}>Close</button>
                        ) : (
                          <button type="button" className={styles.small} disabled={busy} onClick={() => void setStatus(job, "published")}>Publish</button>
                        )}
                        {job.status === "published" && !isExpired(job) ? (
                          <a className={styles.small} href={`/en/jobs/${job.id}`} target="_blank" rel="noopener noreferrer">View</a>
                        ) : null}
                      </>
                    ) : null}
                    <button type="button" className={styles.danger} disabled={busy} onClick={() => void remove(job)}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {applicantsFor ? (
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle}>Applicants · {applicantsFor.title}</h2>
              <button type="button" className={styles.small} onClick={() => setApplicantsFor(null)}>Close</button>
            </div>
            {applicants === null ? (
              <p className={styles.hint}>Loading…</p>
            ) : applicants.length === 0 ? (
              <p className={styles.empty}>No applications yet.</p>
            ) : (
              <ul className={styles.list}>
                {applicants.map((app) => (
                  <li key={app.id} className={styles.row} style={{ alignItems: "flex-start" }}>
                    <div className={styles.rowMain}>
                      <div className={styles.rowTitle}>{app.name}</div>
                      <div className={styles.rowMeta}>
                        <a href={`mailto:${app.email}`}>{app.email}</a>
                        {app.phone ? ` · ${app.phone}` : ""}
                        {app.linkedin ? <> · <a href={app.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a></> : null}
                        {app.cv?.url ? <> · <a href={app.cv.url} target="_blank" rel="noopener noreferrer">CV</a></> : null}
                        {" · "}{formatDate(app.createdAt)}
                      </div>
                      <p className={styles.hint} style={{ marginTop: "0.5rem", whiteSpace: "pre-wrap" }}>{app.message}</p>
                    </div>
                    <select aria-label="Stage" className={styles.input} style={{ width: "auto" }} value={app.status}
                      onChange={(e) => void moveApplicant(app, e.target.value as ApplicationStatus)}>
                      {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}
