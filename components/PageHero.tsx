import styles from "./PageHero.module.scss";

interface Props {
  eyebrow: string;
  heading: string;
  body?: string[];
}

export default function PageHero({ eyebrow, heading, body }: Props) {
  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.heading}>{heading}</h1>
        {body && body.length > 0 && (
          <div className={styles.body}>
            {body.map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>{paragraph}</p>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}