import type { Stat } from "@/content/types";
import styles from "./StatsStrip.module.scss";

interface Props {
  items: Stat[];
}

export default function StatsStrip({ items }: Props) {
  return (
    <section className={styles.section} aria-label="Founding stats">
      <div className={styles.inner}>
        <dl className={styles.list}>
          {items.map((item) => (
            <div key={item.label} className={styles.item}>
              <dt className={styles.value}>{item.value}</dt>
              <dd className={styles.label}>{item.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}