"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ConsoleGate from "@/components/console/ConsoleGate";
import ModuleGuide from "@/components/console/ModuleGuide";
import Funnel from "@/components/console/Funnel";
import TrendBars from "@/components/console/TrendBars";
import { useSession } from "@/components/console/useSession";
import styles from "@/components/console/Console.module.scss";

type Counts = Record<
  | "directory_view"
  | "member_signup"
  | "provider_created"
  | "kyc_submitted"
  | "kyc_verified"
  | "review_submitted"
  | "job_posted"
  | "job_view"
  | "job_apply"
  | "article_submitted"
  | "article_published"
  | "article_view"
  | "lead_created"
  | "lead_responded"
  | "lead_won",
  number
>;

type Overview = {
  days: number;
  totals: {
    members: number;
    newMembers: number;
    admins: number;
    providers: number;
    listed: number;
    verified: number;
    reviews: number;
    liveJobs: number;
    applications: number;
    publishedArticles: number;
    articleViews: number;
  };
  queues: Record<"kyc" | "articles" | "hiddenProviders", { count: number; allowed: boolean }>;
  period: Counts;
  series: { day: string; counts: Counts }[];
  topJobs: { id: string; title: string; company: string; views: number; applications: number }[];
  topArticles: { slug: string; language: string; title: string; views: number }[];
};

const RANGES = [7, 30, 90];

export default function AdminDashboard() {
  const session = useSession();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Overview | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (session.status !== "admin") return;
    setData(null);
    fetch(`/api/admin/overview?days=${days}`)
      .then((res) => res.json())
      .then((body) => (body.ok ? setData(body as Overview) : setFailed(true)))
      .catch(() => setFailed(true));
  }, [session.status, days]);

  const gate = <ConsoleGate session={session} role="admin" />;
  if (session.status !== "admin") return gate;

  const labels = data?.series.map((s) => s.day) ?? [];
  const series = (key: keyof Counts) => data?.series.map((s) => s.counts[key]) ?? [];

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Admin dashboard</p>
            <h1 className={styles.title}>CR-CIPI at a glance</h1>
            <p className={styles.subtitle}>Growth, engagement and what needs your attention.</p>
          </div>
          <div className={styles.actions}>
            <ModuleGuide area="admin" id="routine" />
            <div className={styles.tabs}>
              {RANGES.map((range) => (
                <button key={range} type="button" onClick={() => setDays(range)}
                  className={`${styles.tab} ${days === range ? styles.tabActive : ""}`}>
                  {range} days
                </button>
              ))}
            </div>
          </div>
        </header>

        {failed ? <p className={styles.error}>Couldn&apos;t load the dashboard.</p> : null}
        {!data ? (
          !failed && <p className={styles.hint}>Loading…</p>
        ) : (
          <>
            {(() => {
              const queues = [
                { key: "kyc", label: "verification(s) to review", href: "/admin/verification" },
                { key: "articles", label: "article(s) waiting for an editor", href: "/admin/articles" },
              ] as const;
              const pending = queues.filter((q) => data.queues[q.key].allowed && data.queues[q.key].count > 0);
              return pending.length > 0 ? (
                <div className={styles.warn}>
                  <strong>Needs attention: </strong>
                  {pending.map((q, i) => (
                    <span key={q.key}>
                      {i > 0 ? " · " : ""}
                      <Link href={q.href}>{data.queues[q.key].count} {q.label}</Link>
                    </span>
                  ))}
                </div>
              ) : (
                <p className={styles.notice}>All review queues are clear.</p>
              );
            })()}

            <div className={styles.stats}>
              <Link href="/admin/users" className={styles.stat}>
                <span className={styles.statLabel}>Members</span>
                <span className={styles.statValue}>{data.totals.members}</span>
                <span className={styles.statHint}>+{data.totals.newMembers} in {data.days} days</span>
              </Link>
              <Link href="/admin/providers" className={styles.stat}>
                <span className={styles.statLabel}>Listed providers</span>
                <span className={styles.statValue}>{data.totals.listed}</span>
                <span className={styles.statHint}>{data.totals.verified} verified · {data.totals.reviews} reviews</span>
              </Link>
              <Link href="/admin/jobs" className={styles.stat}>
                <span className={styles.statLabel}>Live jobs</span>
                <span className={styles.statValue}>{data.totals.liveJobs}</span>
                <span className={styles.statHint}>{data.totals.applications} applications all-time</span>
              </Link>
              <Link href="/admin/articles" className={styles.stat}>
                <span className={styles.statLabel}>Articles</span>
                <span className={styles.statValue}>{data.totals.publishedArticles}</span>
                <span className={styles.statHint}>{data.totals.articleViews} reads all-time</span>
              </Link>
            </div>

            <div className={styles.grid2}>
              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Membership funnel</h2>
                <p className={styles.help} style={{ margin: "0.25rem 0 1rem" }}>Last {data.days} days</p>
                <Funnel steps={[
                  { label: "Sign-ups", value: data.period.member_signup },
                  { label: "Businesses listed", value: data.period.provider_created },
                  { label: "Verification submitted", value: data.period.kyc_submitted },
                  { label: "Verified", value: data.period.kyc_verified },
                ]} />
                <TrendBars title="Daily sign-ups" values={series("member_signup")} labels={labels} />
              </section>

              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Talent funnel</h2>
                <p className={styles.help} style={{ margin: "0.25rem 0 1rem" }}>Last {data.days} days</p>
                <Funnel steps={[
                  { label: "Job views", value: data.period.job_view },
                  { label: "Applications", value: data.period.job_apply },
                ]} />
                <p className={styles.hint} style={{ margin: "0.75rem 0" }}>{data.period.job_posted} job(s) published in the period.</p>
                <TrendBars title="Daily applications" values={series("job_apply")} labels={labels} />
              </section>

              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Investor demand</h2>
                <p className={styles.help} style={{ margin: "0.25rem 0 1rem" }}>Last {data.days} days · Contactos</p>
                <Funnel steps={[
                  { label: "Directory visits", value: data.period.directory_view },
                  { label: "Consultation requests", value: data.period.lead_created },
                  { label: "Answered by members", value: data.period.lead_responded },
                  { label: "Won", value: data.period.lead_won },
                ]} />
                <TrendBars title="Daily consultation requests" values={series("lead_created")} labels={labels} />
              </section>

              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Directory trust</h2>
                <p className={styles.help} style={{ margin: "0.25rem 0 1rem" }}>Last {data.days} days</p>
                <Funnel steps={[
                  { label: "Directory visits", value: data.period.directory_view },
                  { label: "New reviews", value: data.period.review_submitted },
                ]} />
                <TrendBars title="Daily directory visits" values={series("directory_view")} labels={labels} />
              </section>

              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Content</h2>
                <p className={styles.help} style={{ margin: "0.25rem 0 1rem" }}>Last {data.days} days</p>
                <Funnel steps={[
                  { label: "Articles submitted", value: data.period.article_submitted },
                  { label: "Published", value: data.period.article_published },
                ]} />
                <p className={styles.hint} style={{ margin: "0.75rem 0" }}>{data.period.article_view} article reads.</p>
                <TrendBars title="Daily article reads" values={series("article_view")} labels={labels} />
              </section>
            </div>

            <div className={styles.grid2}>
              <section className={styles.card}>
                <h2 className={styles.cardTitle} style={{ marginBottom: "1rem" }}>Top jobs</h2>
                {data.topJobs.length === 0 ? <p className={styles.empty}>No job activity yet.</p> : (
                  <table className={styles.table}>
                    <thead><tr><th>Job</th><th>Views</th><th>Apps</th></tr></thead>
                    <tbody>
                      {data.topJobs.map((j) => (
                        <tr key={j.id}>
                          <td><a href={`/en/jobs/${j.id}`} target="_blank" rel="noopener noreferrer">{j.title}</a><div className={styles.rowMeta}>{j.company}</div></td>
                          <td>{j.views}</td>
                          <td>{j.applications}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
              <section className={styles.card}>
                <h2 className={styles.cardTitle} style={{ marginBottom: "1rem" }}>Top articles</h2>
                {data.topArticles.length === 0 ? <p className={styles.empty}>No published articles yet.</p> : (
                  <table className={styles.table}>
                    <thead><tr><th>Article</th><th>Reads</th></tr></thead>
                    <tbody>
                      {data.topArticles.map((a) => (
                        <tr key={a.slug}>
                          <td><a href={`/${a.language}/blog/${a.slug}`} target="_blank" rel="noopener noreferrer">{a.title}</a></td>
                          <td>{a.views}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
