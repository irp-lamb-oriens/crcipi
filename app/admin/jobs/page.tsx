"use client";

import { useCallback, useEffect, useState } from "react";
import ConsoleGate from "@/components/console/ConsoleGate";
import StatusBadge from "@/components/console/StatusBadge";
import { useSession } from "@/components/console/useSession";
import { formatDate } from "@/components/console/labels";
import styles from "@/components/console/Console.module.scss";
import type { JobStatus } from "@/lib/jobOptions";

type Job = {
  id: string;
  title: string;
  providerName: string;
  status: JobStatus;
  createdAt: number;
  expiresAt: number | null;
  viewsCount: number;
  applicationsCount: number;
};

export default function AdminJobsPage() {
  const session = useSession();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/jobs");
    if (!res.ok) {
      setJobs([]);
      setError("You don't have the Manage job board permission.");
      return;
    }
    setJobs((await res.json()).jobs as Job[]);
  }, []);

  useEffect(() => {
    if (session.status === "admin") void load();
  }, [session.status, load]);

  const gate = <ConsoleGate session={session} role="admin" />;
  if (session.status !== "admin") return gate;

  async function setStatus(job: Job, status: "removed" | "published") {
    if (status === "removed" && !window.confirm(`Take down "${job.title}"? The member can no longer edit it.`)) return;
    const res = await fetch(`/api/admin/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) setError("Update failed.");
    void load();
  }

  const live = (jobs ?? []).filter((j) => j.status === "published" && (!j.expiresAt || j.expiresAt > Date.now()));
  const views = (jobs ?? []).reduce((n, j) => n + j.viewsCount, 0);
  const apps = (jobs ?? []).reduce((n, j) => n + j.applicationsCount, 0);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Job board</p>
            <h1 className={styles.title}>All job posts</h1>
            <p className={styles.subtitle}>Members publish directly. Take down anything that breaks the terms of use.</p>
          </div>
        </header>
        {error ? <p className={styles.error}>{error}</p> : null}
        <div className={styles.stats}>
          <div className={styles.stat}><span className={styles.statLabel}>Live</span><span className={styles.statValue}>{live.length}</span></div>
          <div className={styles.stat}><span className={styles.statLabel}>All posts</span><span className={styles.statValue}>{jobs?.length ?? 0}</span></div>
          <div className={styles.stat}><span className={styles.statLabel}>Views</span><span className={styles.statValue}>{views}</span></div>
          <div className={styles.stat}><span className={styles.statLabel}>Applications</span><span className={styles.statValue}>{apps}</span></div>
        </div>
        <section className={styles.card}>
          {jobs === null ? (
            <p className={styles.hint}>Loading…</p>
          ) : jobs.length === 0 ? (
            <p className={styles.empty}>No job posts yet.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr><th>Job</th><th>Company</th><th>Status</th><th>Views</th><th>Apps</th><th>Created</th><th /></tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td>
                        {job.status === "published" ? (
                          <a href={`/en/jobs/${job.id}`} target="_blank" rel="noopener noreferrer">{job.title}</a>
                        ) : job.title}
                      </td>
                      <td>{job.providerName}</td>
                      <td>
                        <StatusBadge tone={job.status === "published" ? "good" : job.status === "removed" ? "bad" : "neutral"}>
                          {job.status}
                        </StatusBadge>
                      </td>
                      <td>{job.viewsCount}</td>
                      <td>{job.applicationsCount}</td>
                      <td>{formatDate(job.createdAt)}</td>
                      <td>
                        {job.status === "removed" ? (
                          <button type="button" className={styles.small} onClick={() => void setStatus(job, "published")}>Restore</button>
                        ) : (
                          <button type="button" className={styles.danger} onClick={() => void setStatus(job, "removed")}>Take down</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
