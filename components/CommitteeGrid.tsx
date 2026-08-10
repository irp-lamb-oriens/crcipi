import type { Committee } from "@/content/types";
import styles from "./CommitteeGrid.module.scss";

interface Props {
  eyebrow: string;
  heading: string;
  items: Committee[];
}

export default function CommitteeGrid({ eyebrow, heading, items }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.heading}>{heading}</h2>
        <ul className={styles.grid}>
          {items.map((item, i) => (
            <li key={item.name} className={styles.item}>
              <span className={styles.index} aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className={styles.name}>{item.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}