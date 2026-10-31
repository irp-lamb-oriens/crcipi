"use client";

import { useEffect, useState } from "react";
import styles from "./TrustPanel.module.scss";

type Pillar = "legal" | "profile" | "responsiveness" | "reviews" | "activity";
type Score = {
  total: number;
  pillars: Record<Pillar, { score: number; earned: string[]; missing: string[] }>;
};

const LABELS: Record<Pillar, string> = {
  legal: "Legal",
  profile: "Profile",
  responsiveness: "Responsiveness",
  reviews: "Reviews",
  activity: "Activity",
};

// The member's trust score: a dial with the total, five pillar bars, and
// for each pillar what earned points and what would earn more.
export default function TrustPanel({ providerId, refreshKey }: { providerId: string; refreshKey?: unknown }) {
  const [score, setScore] = useState<Score | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setScore(null);
    setFailed(false);
    fetch(`/api/member/providers/${providerId}/trust`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((b: { score: Score }) => setScore(b.score))
      .catch(() => setFailed(true));
  }, [providerId, refreshKey]);

  if (failed) return null;
  if (!score) return <div className={styles.panel} aria-busy="true" />;

  const pillars = Object.keys(LABELS) as Pillar[];
  const next = pillars
    .flatMap((p) => score.pillars[p].missing.map((m) => ({ p, m, gap: 20 - score.pillars[p].score })))
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 3);

  return (
    <section className={styles.panel} aria-labelledby="trust-title">
      <div className={styles.dial}>
        <svg viewBox="0 0 120 120" className={styles.ring} aria-hidden="true">
          <circle cx="60" cy="60" r="54" className={styles.ringTrack} />
          <circle
            cx="60"
            cy="60"
            r="54"
            className={styles.ringFill}
            style={{ strokeDashoffset: 339.3 * (1 - score.total / 100) }}
          />
        </svg>
        <p className={styles.total}>
          <span id="trust-title" className={styles.label}>Trust score</span>
          <strong>{score.total}</strong>
          <span className={styles.of}>out of 100</span>
        </p>
      </div>

      <ul className={styles.pillars}>
        {pillars.map((p) => {
          const pillar = score.pillars[p];
          return (
            <li key={p}>
              <div className={styles.row}>
                <span>{LABELS[p]}</span>
                <span className={styles.points}>{pillar.score} / 20</span>
              </div>
              <span className={styles.bar} aria-hidden="true">
                <span style={{ transform: `scaleX(${pillar.score / 20})` }} />
              </span>
              {pillar.earned.length ? <p className={styles.earned}>{pillar.earned.join(" · ")}</p> : null}
            </li>
          );
        })}
      </ul>

      {next.length ? (
        <div className={styles.next}>
          <h3>Raise your score</h3>
          <ol>
            {next.map((n) => (
              <li key={n.m}>
                {n.m} <span>· {LABELS[n.p]}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
