import styles from "./Console.module.scss";

export interface FunnelStep {
  label: string;
  value: number;
}

// Horizontal funnel: each bar is scaled to the first step, and each step after
// the first shows its conversion from the previous one.
export default function Funnel({ steps }: { steps: FunnelStep[] }) {
  const top = Math.max(steps[0]?.value ?? 0, 1);
  return (
    <ol className={styles.funnel}>
      {steps.map((step, i) => {
        const prev = i > 0 ? steps[i - 1].value : null;
        const rate = prev ? Math.round((step.value / prev) * 1000) / 10 : null;
        return (
          <li key={step.label} className={styles.funnelRow}>
            <span>{step.label}</span>
            <span className={styles.funnelTrack} aria-hidden="true">
              <span
                className={styles.funnelFill}
                style={{ display: "block", width: `${Math.min((step.value / top) * 100, 100)}%` }}
              />
            </span>
            <span className={styles.funnelValue}>
              {step.value.toLocaleString()}
              {rate !== null ? <small>{rate}%</small> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
