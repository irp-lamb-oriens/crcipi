import styles from "./Console.module.scss";

// Minimal daily bar chart (inline SVG, no chart dependency).
export default function TrendBars({
  values,
  labels,
  title,
}: {
  values: number[];
  labels: string[];
  title: string;
}) {
  const max = Math.max(...values, 1);
  const width = 100 / Math.max(values.length, 1);
  return (
    <svg className={styles.trend} viewBox="0 0 100 40" preserveAspectRatio="none" role="img">
      <title>{title}</title>
      {values.map((value, i) => {
        const h = (value / max) * 38;
        return (
          <rect
            key={labels[i] ?? i}
            x={i * width + width * 0.15}
            y={40 - h}
            width={width * 0.7}
            height={Math.max(h, value > 0 ? 1 : 0.3)}
            fill="currentColor"
            opacity={value > 0 ? 1 : 0.25}
          >
            <title>{`${labels[i]}: ${value}`}</title>
          </rect>
        );
      })}
    </svg>
  );
}
