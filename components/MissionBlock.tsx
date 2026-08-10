import styles from "./MissionBlock.module.scss";

interface Props {
  eyebrow: string;
  heading: string;
  body: string;
}

export default function MissionBlock({ eyebrow, heading, body }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.heading}>{heading}</h2>
        <p className={styles.body}>{body}</p>
      </div>
    </section>
  );
}