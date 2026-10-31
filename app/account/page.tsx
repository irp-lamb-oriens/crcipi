"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ConsoleGate from "@/components/console/ConsoleGate";
import ModuleGuide from "@/components/console/ModuleGuide";
import StatusBadge from "@/components/console/StatusBadge";
import { useSession } from "@/components/console/useSession";
import { kycTone, KYC_STATUS_LABELS } from "@/components/console/labels";
import styles from "@/components/console/Console.module.scss";
import type { KycStatus } from "@/lib/kycOptions";

type Overview = {
  name: string;
  businesses: {
    id: string;
    name: string;
    approved: boolean;
    verified: boolean;
    kycStatus: KycStatus;
    ratingsCount: number;
    average: number | null;
  }[];
  reviews: { count: number; average: number | null };
  jobs: { live: number; total: number; views: number; applications: number };
  articles: { published: number; inReview: number; needsChanges: number; views: number };
  leads: { new: number; overdue: number; won: number; total: number };
};

// Member home: what's working, and the single next thing that adds leverage.
export default function MemberDashboard() {
  const session = useSession();
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    if (session.status !== "member") return;
    fetch("/api/member/overview")
      .then((res) => res.json())
      .then((body) => body.ok && setData(body as Overview))
      .catch(() => {});
  }, [session.status]);

  const gate = <ConsoleGate session={session} role="member" />;
  if (session.status !== "member") return gate;

  const steps = data
    ? [
        { done: data.businesses.length > 0, label: "List your business in the directory", href: "/account/businesses" },
        { done: data.businesses.some((b) => b.verified), label: "Get the Verified badge", href: "/account/verification" },
        { done: data.jobs.total > 0, label: "Post a job to reach qualified candidates", href: "/account/jobs" },
        { done: data.articles.published > 0, label: "Publish an article to show your expertise", href: "/account/articles" },
      ]
    : [];
  const doneCount = steps.filter((s) => s.done).length;
  const applyRate = data && data.jobs.views ? Math.round((data.jobs.applications / data.jobs.views) * 1000) / 10 : null;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Member dashboard</p>
            <h1 className={styles.title}>Welcome{session.name ? `, ${session.name.split(" ")[0]}` : ""}</h1>
            <p className={styles.subtitle}>
              Your presence in the CR-CIPI community at a glance. <Link href="/account/report">This month&apos;s report →</Link>
            </p>
          </div>
          <ModuleGuide area="member" id="home" />
        </header>

        {!data ? (
          <p className={styles.hint}>Loading…</p>
        ) : (
          <>
            <div className={styles.stats}>
              <Link href="/account/leads" className={styles.stat}>
                <span className={styles.statLabel}>New leads</span>
                <span className={styles.statValue}>{data.leads.new}</span>
                <span className={styles.statHint}>
                  {data.leads.overdue > 0
                    ? `${data.leads.overdue} waiting over 24 h`
                    : `${data.leads.total} all-time · ${data.leads.won} won`}
                </span>
              </Link>
              <Link href="/account/businesses" className={styles.stat}>
                <span className={styles.statLabel}>Businesses</span>
                <span className={styles.statValue}>{data.businesses.length}</span>
                <span className={styles.statHint}>{data.businesses.filter((b) => b.verified).length} verified</span>
              </Link>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Reviews</span>
                <span className={styles.statValue}>{data.reviews.count}</span>
                <span className={styles.statHint}>
                  {data.reviews.average !== null ? `${data.reviews.average.toFixed(1)} ★ average` : "No reviews yet"}
                </span>
              </div>
              <Link href="/account/jobs" className={styles.stat}>
                <span className={styles.statLabel}>Job applications</span>
                <span className={styles.statValue}>{data.jobs.applications}</span>
                <span className={styles.statHint}>
                  {data.jobs.views} views{applyRate !== null ? ` · ${applyRate}% apply` : ""} · {data.jobs.live} live
                </span>
              </Link>
              <Link href="/account/articles" className={styles.stat}>
                <span className={styles.statLabel}>Article reads</span>
                <span className={styles.statValue}>{data.articles.views}</span>
                <span className={styles.statHint}>{data.articles.published} published</span>
              </Link>
            </div>

            <div className={styles.grid2}>
              <section className={styles.card}>
                <div className={styles.cardHead}>
                  <h2 className={styles.cardTitle}>Get the most from your membership</h2>
                  <StatusBadge tone={doneCount === steps.length ? "good" : "info"}>
                    {doneCount}/{steps.length}
                  </StatusBadge>
                </div>
                <ul className={styles.list}>
                  {steps.map((step) => (
                    <li key={step.href} className={styles.row}>
                      <span className={styles.rowMain}>
                        <span className={styles.rowTitle} style={{ fontWeight: step.done ? 400 : 700 }}>
                          {step.done ? "✓" : "○"} {step.label}
                        </span>
                      </span>
                      {!step.done ? <Link className={styles.small} href={step.href}>Start</Link> : null}
                    </li>
                  ))}
                </ul>
              </section>

              <section className={styles.card}>
                <h2 className={styles.cardTitle} style={{ marginBottom: "1rem" }}>Your businesses</h2>
                {data.businesses.length === 0 ? (
                  <p className={styles.empty}>
                    No businesses yet. <Link href="/account/businesses">Add one</Link>
                  </p>
                ) : (
                  <ul className={styles.list}>
                    {data.businesses.map((b) => (
                      <li key={b.id} className={styles.row}>
                        <div className={styles.rowMain}>
                          <div className={styles.rowTitle}>{b.name}</div>
                          <div className={styles.rowMeta}>
                            {b.approved ? "Listed" : "Hidden"} · {b.ratingsCount} reviews
                            {b.average !== null ? ` · ${b.average.toFixed(1)} ★` : ""}
                          </div>
                        </div>
                        <Link href={`/account/verification?provider=${b.id}`}>
                          <StatusBadge tone={kycTone(b.kycStatus)}>{KYC_STATUS_LABELS[b.kycStatus]}</StatusBadge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {data.articles.needsChanges > 0 ? (
                  <p className={styles.warn} style={{ marginTop: "1rem" }}>
                    {data.articles.needsChanges} article(s) need changes. <Link href="/account/articles">Review notes</Link>
                  </p>
                ) : null}
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
