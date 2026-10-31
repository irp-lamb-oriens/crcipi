"use client";

import styles from "./Report.module.scss";

export function lastMonths(n = 12): string[] {
  const now = new Date();
  return Array.from({ length: n }, (_, i) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 7)
  );
}

export function monthLabel(month: string, locale = "en-US") {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString(locale, { month: "long", year: "numeric", timeZone: "UTC" });
}

export function hours(h: number | null) {
  if (h === null) return "—";
  if (h < 1) return "< 1 h";
  if (h < 48) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} d`;
}

export function ReportHead({
  eyebrow,
  month,
  onMonth,
  subtitle,
}: {
  eyebrow: string;
  month: string;
  onMonth: (m: string) => void;
  subtitle: string;
}) {
  return (
    <header className={styles.cover}>
      <div>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.month}>{monthLabel(month)}</h1>
        <p className={styles.sub}>{subtitle}</p>
      </div>
      <div className={styles.controls}>
        <label>
          <span className="srOnly">Month</span>
          <select value={month} onChange={(e) => onMonth(e.target.value)} className={styles.select}>
            {lastMonths().map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className={styles.print} onClick={() => window.print()}>
          Save as PDF
        </button>
      </div>
    </header>
  );
}

export function Figure({
  label,
  value,
  prev,
  hint,
}: {
  label: string;
  value: number | string;
  prev?: number;
  hint?: string;
}) {
  let delta: string | null = null;
  let tone = "";
  if (typeof value === "number" && typeof prev === "number") {
    const d = value - prev;
    delta = d === 0 ? "same as last month" : `${d > 0 ? "+" : "−"}${Math.abs(d)} vs last month`;
    tone = d > 0 ? styles.up : d < 0 ? styles.down : "";
  }
  return (
    <div className={styles.figure}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      {delta ? <span className={`${styles.delta} ${tone}`}>{delta}</span> : null}
      {hint ? <span className={styles.hint}>{hint}</span> : null}
    </div>
  );
}

export function Chapter({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className={styles.chapter} aria-labelledby={`ch-${n}`}>
      <h2 id={`ch-${n}`} className={styles.chapterTitle}>
        <span aria-hidden="true">{n}</span>
        {title}
      </h2>
      <div className={styles.figures}>{children}</div>
    </section>
  );
}

export { styles as reportStyles };
