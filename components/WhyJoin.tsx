"use client";

import EditableText from "@/components/cms/EditableText";
import styles from "./WhyJoin.module.scss";

interface Props {
  eyebrow: string;
  heading: string;
  body: string;
}

// Sticky split: the question stays pinned while the answer scrolls past.
export default function WhyJoin({ eyebrow, heading, body }: Props) {
  return (
    <section className={styles.section} aria-labelledby="why-title">
      <div className={styles.inner}>
        <div className={styles.aside}>
          <p className={styles.kicker}>
            <span>03</span>
            <EditableText path="home.whyJoin.eyebrow" as="span">
              {eyebrow}
            </EditableText>
          </p>
          <EditableText path="home.whyJoin.heading" as="h2" className={styles.heading} id="why-title">
            {heading}
          </EditableText>
          <span className={styles.flag} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </div>
        <EditableText path="home.whyJoin.body" as="p" className={`${styles.body} reveal`}>
          {body}
        </EditableText>
      </div>
    </section>
  );
}
