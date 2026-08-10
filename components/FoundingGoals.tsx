import type { FoundingGoal } from "@/content/types";
import styles from "./FoundingGoals.module.scss";

interface Props {
  eyebrow: string;
  heading: string;
  items: FoundingGoal[];
}

export default function FoundingGoals({ eyebrow, heading, items }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.heading}>{heading}</h2>
        <dl className={styles.list}>
          {items.map((item) => (
            <div key={item.metric} className={styles.item}>
              <dt className={styles.metric}>{item.metric}</dt>
              <dd className={styles.target}>{item.target}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}