import styles from "./WhatWeAreNot.module.scss";

interface Props {
  eyebrow: string;
  heading: string;
  items: string[];
  positioning: string;
}

export default function WhatWeAreNot({ eyebrow, heading, items, positioning }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.heading}>{heading}</h2>
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item} className={styles.item}>
              {item}
            </li>
          ))}
        </ul>
        <p className={styles.positioning}>{positioning}</p>
      </div>
    </section>
  );
}