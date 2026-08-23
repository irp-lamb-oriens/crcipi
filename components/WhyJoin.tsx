"use client";

import EditableText from "@/components/cms/EditableText";
import styles from "./WhyJoin.module.scss";

interface Props {
  eyebrow: string;
  heading: string;
  body: string;
}

export default function WhyJoin({ eyebrow, heading, body }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <EditableText path="home.whyJoin.eyebrow" as="p" className={styles.eyebrow}>
          {eyebrow}
        </EditableText>
        <EditableText path="home.whyJoin.heading" as="h2" className={styles.heading}>
          {heading}
        </EditableText>
        <EditableText path="home.whyJoin.body" as="p" className={styles.body}>
          {body}
        </EditableText>
      </div>
    </section>
  );
}