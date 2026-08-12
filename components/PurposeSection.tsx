import styles from "./PurposeSection.module.scss";

interface Props {
  eyebrow: string;
  heading: string;
  body: string;
  vision: string;
}

export default function PurposeSection({ eyebrow, heading, body, vision }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.heading}>{heading}</h2>
        <p className={styles.body}>{body}</p>
        <p className={styles.vision}>{vision}</p>
      </div>
    </section>
  );
}