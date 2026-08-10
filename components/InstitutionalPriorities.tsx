import type { InstitutionalPriority as PriorityType } from "@/content/types";
import styles from "./InstitutionalPriorities.module.scss";

interface Props {
  eyebrow: string;
  heading: string;
  items: PriorityType[];
}

export default function InstitutionalPriorities({ eyebrow, heading, items }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.heading}>{heading}</h2>
        <ol className={styles.list}>
          {items.map((item, i) => (
            <li key={item.title} className={styles.item}>
              <span className={styles.index} aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className={styles.text}>
                <h3 className={styles.title}>{item.title}</h3>
                <p className={styles.description}>{item.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}