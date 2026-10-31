"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ConsoleGate from "@/components/console/ConsoleGate";
import { useSession } from "@/components/console/useSession";
import { Chapter, Figure, hours, ReportHead, reportStyles as r } from "@/components/console/ReportKit";
import styles from "@/components/console/Console.module.scss";

type Report = {
  month: string;
  businesses: { id: string; name: string; verified: boolean; score: number; next: string[] }[];
  reach: { profileViews: number; profileViewsPrev: number; articleReads: number; jobViews: number; applications: number };
  leads: { received: number; receivedPrev: number; answered: number; medianReplyHours: number | null; won: number };
  reviews: { count: number; average: number | null };
};

// A member's month on CR-CIPI: reach, requests, reviews, and what to do next.
export default function MemberReport() {
  const session = useSession();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<Report | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (session.status !== "member") return;
    setData(null);
    fetch(`/api/member/report?month=${month}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((b: { report: Report }) => setData(b.report))
      .catch(() => setFailed(true));
  }, [session.status, month]);

  const gate = <ConsoleGate session={session} role="member" />;
  if (session.status !== "member") return gate;

  return (
    <main className={styles.page}>
      <div className={`${styles.shell} ${r.paper}`}>
        <ReportHead
          eyebrow={`Monthly report${data?.businesses[0] ? ` · ${data.businesses.map((b) => b.name).join(", ")}` : ""}`}
          month={month}
          onMonth={setMonth}
          subtitle="What CR-CIPI brought your company this month."
        />
        {failed ? <p className={styles.error}>Couldn&apos;t load the report.</p> : null}
        {!data && !failed ? <p className={styles.hint}>Loading…</p> : null}
        {data && data.businesses.length === 0 ? (
          <p className={styles.empty}>
            Your report starts once your company is listed. <Link href="/en/register">Register your company</Link>
          </p>
        ) : null}
        {data && data.businesses.length > 0 ? (
          <>
            <Chapter n="i" title="Reach">
              <Figure label="Profile views" value={data.reach.profileViews} prev={data.reach.profileViewsPrev} />
              <Figure label="Article reads" value={data.reach.articleReads} />
              <Figure label="Job views" value={data.reach.jobViews} />
              <Figure label="Applications" value={data.reach.applications} />
            </Chapter>
            <Chapter n="ii" title="Consultation requests">
              <Figure label="Received" value={data.leads.received} prev={data.leads.receivedPrev} />
              <Figure label="Answered" value={data.leads.answered} />
              <Figure label="Median reply" value={hours(data.leads.medianReplyHours)} hint="investors see this" />
              <Figure label="Won" value={data.leads.won} />
              <Figure label="New reviews" value={data.reviews.count}
                hint={data.reviews.average !== null ? `${data.reviews.average.toFixed(1)} ★ average` : undefined} />
            </Chapter>
            <section className={r.chapter} aria-labelledby="ch-iii">
              <h2 id="ch-iii" className={r.chapterTitle}>
                <span aria-hidden="true">iii</span>Trust score today
              </h2>
              <div className={r.figures}>
                {data.businesses.map((b) => (
                  <div key={b.id} className={r.figure}>
                    <span className={r.label}>{b.name}{b.verified ? " · ✓ Seal" : ""}</span>
                    <span className={r.value}>{b.score}<small style={{ fontSize: "0.4em" }}> / 100</small></span>
                    {b.next.length ? (
                      <ol className={r.next}>
                        {b.next.map((n) => <li key={n}>{n}</li>)}
                      </ol>
                    ) : null}
                  </div>
                ))}
              </div>
              <p className={r.note} style={{ marginTop: "0.75rem" }}>
                <Link href="/account/verification">See the full breakdown →</Link>
              </p>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
