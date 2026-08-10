import type { PriorityCard as PriorityCardType } from "@/content/types";
import styles from "./PriorityCards.module.scss";

interface Props {
  eyebrow: string;
  heading: string;
  cards: PriorityCardType[];
}

export default function PriorityCards({ eyebrow, heading, cards }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.heading}>{heading}</h2>
        <div className={styles.grid}>
          {cards.map((card, i) => (
            <article key={card.title} className={styles.card}>
              <span className={styles.index} aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className={styles.cardTitle}>{card.title}</h3>
              <p className={styles.cardBody}>{card.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}