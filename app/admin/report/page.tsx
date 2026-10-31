"use client";

import { useEffect, useState } from "react";
import ConsoleGate from "@/components/console/ConsoleGate";
import { useSession } from "@/components/console/useSession";
import { Chapter, Figure, hours, ReportHead, reportStyles as r } from "@/components/console/ReportKit";
import styles from "@/components/console/Console.module.scss";

type Board = {
  month: string;
  membership: { listed: number; newCompanies: number; verified: number; signups: number; signupsPrev: number; verificationsApproved: number };
  demand: {
    directoryViews: number; profileViews: number; profileViewsPrev: number; received: number; receivedPrev: number;
    answered: number; medianReplyHours: number | null; won: number; reviews: number;
  };
  talent: { jobsPosted: number; jobViews: number; applications: number };
  content: { published: number; reads: number };
  topMembers: { id: string; name: string; verified: boolean; received: number; answered: number; medianReplyHours: number | null; won: number }[];
};

// The Board's monthly report: is the platform connecting investors with
// trusted members, month on month?
export default function BoardReport() {
  const session = useSession();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<Board | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (session.status !== "admin") return;
    setData(null);
    fetch(`/api/admin/report?month=${month}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((b: { report: Board }) => setData(b.report))
      .catch(() => setFailed(true));
  }, [session.status, month]);

  const gate = <ConsoleGate session={session} role="admin" />;
  if (session.status !== "admin") return gate;

  const seal = data && data.membership.listed ? Math.round((data.membership.verified / data.membership.listed) * 100) : 0;
  const answeredPct = data && data.demand.received ? Math.round((data.demand.answered / data.demand.received) * 100) : null;

  return (
    <main className={styles.page}>
      <div className={`${styles.shell} ${r.paper}`}>
        <ReportHead
          eyebrow="CR-CIPI · Report to the Board"
          month={month}
          onMonth={setMonth}
          subtitle="How well the platform connected international investors with verified members this month."
        />
        {failed ? <p className={styles.error}>Couldn&apos;t load the report.</p> : null}
        {!data && !failed ? <p className={styles.hint}>Loading…</p> : null}
        {data ? (
          <>
            <Chapter n="i" title="Investor demand">
              <Figure label="Profile views" value={data.demand.profileViews} prev={data.demand.profileViewsPrev} />
              <Figure label="Consultation requests" value={data.demand.received} prev={data.demand.receivedPrev} />
              <Figure label="Answered" value={answeredPct === null ? "—" : `${answeredPct}%`} hint={`${data.demand.answered} of ${data.demand.received}`} />
              <Figure label="Median reply" value={hours(data.demand.medianReplyHours)} hint="target under 24 h" />
              <Figure label="Won" value={data.demand.won} />
              <Figure label="New reviews" value={data.demand.reviews} />
            </Chapter>

            <Chapter n="ii" title="Membership and trust">
              <Figure label="Listed companies" value={data.membership.listed} />
              <Figure label="New this month" value={data.membership.newCompanies} />
              <Figure label="With the seal" value={`${seal}%`} hint="target 60%" />
              <Figure label="Seals granted" value={data.membership.verificationsApproved} />
              <Figure label="Sign-ups" value={data.membership.signups} prev={data.membership.signupsPrev} />
            </Chapter>

            <Chapter n="iii" title="Talent and content">
              <Figure label="Jobs published" value={data.talent.jobsPosted} />
              <Figure label="Job views" value={data.talent.jobViews} />
              <Figure label="Applications" value={data.talent.applications} />
              <Figure label="Articles published" value={data.content.published} />
              <Figure label="Article reads" value={data.content.reads} />
            </Chapter>

            <section className={r.chapter} aria-labelledby="ch-iv">
              <h2 id="ch-iv" className={r.chapterTitle}>
                <span aria-hidden="true">iv</span>Most requested members
              </h2>
              {data.topMembers.length === 0 ? (
                <p className={r.note}>No consultation requests this month.</p>
              ) : (
                <div className={r.tableWrap}>
                  <table className={r.table}>
                    <thead>
                      <tr><th>Member</th><th>Requests</th><th>Answered</th><th>Median reply</th><th>Won</th></tr>
                    </thead>
                    <tbody>
                      {data.topMembers.map((m) => (
                        <tr key={m.id}>
                          <td>{m.name}{m.verified ? " ✓" : ""}</td>
                          <td>{m.received}</td>
                          <td>{m.answered}</td>
                          <td>{hours(m.medianReplyHours)}</td>
                          <td>{m.won}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            <p className={r.note}>Figures cover {month} in UTC. Platform counters started when each feature launched.</p>
          </>
        ) : null}
      </div>
    </main>
  );
}
