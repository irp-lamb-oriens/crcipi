import type { ParticipationOption } from "@/content/types";
import styles from "./ParticipationCards.module.scss";

interface Props {
  eyebrow: string;
  heading: string;
  options: ParticipationOption[];
}

export default function ParticipationCards({ eyebrow, heading, options }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.heading}>{heading}</h2>
        <div className={styles.grid}>
          {options.map((option, i) => (
            <article key={option.title} className={styles.card}>
              <span className={styles.index} aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className={styles.title}>{option.title}</h3>
              <p className={styles.purpose}>{option.purpose}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}