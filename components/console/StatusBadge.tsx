import styles from "./Console.module.scss";

export type BadgeTone = "good" | "warn" | "bad" | "info" | "neutral";

const TONE_CLASS: Record<BadgeTone, string | undefined> = {
  good: styles.badgeGood,
  warn: styles.badgeWarn,
  bad: styles.badgeBad,
  info: styles.badgeInfo,
  neutral: undefined,
};

export default function StatusBadge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return <span className={`${styles.badge} ${TONE_CLASS[tone] ?? ""}`}>{children}</span>;
}
