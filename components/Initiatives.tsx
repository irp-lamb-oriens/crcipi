import type { Initiative } from "@/content/types";
import styles from "./Initiatives.module.scss";

interface Props {
  eyebrow: string;
  heading: string;
  exampleLabel: string;
  memberValueLabel: string;
  items: Initiative[];
}

export default function Initiatives({ eyebrow, heading, exampleLabel, memberValueLabel, items }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.heading}>{heading}</h2>
        <div className={styles.list}>
          {items.map((item, i) => (
            <article key={item.title} className={styles.item}>
              <div className={styles.index} aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className={styles.content}>
                <h3 className={styles.title}>{item.title}</h3>
                <p className={styles.body}>{item.body}</p>
                <div className={styles.example}>
                  <span className={styles.exampleLabel}>{exampleLabel}</span>
                  <p className={styles.exampleText}>{item.example}</p>
                </div>
                <p className={styles.memberValue}>
                  <span className={styles.memberLabel}>{memberValueLabel}</span>
                  {item.memberValue}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}