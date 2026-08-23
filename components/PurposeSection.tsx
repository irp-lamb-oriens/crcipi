"use client";

import EditableText from "@/components/cms/EditableText";
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
        <EditableText path="home.purpose.eyebrow" as="p" className={styles.eyebrow}>
          {eyebrow}
        </EditableText>
        <EditableText path="home.purpose.heading" as="h2" className={styles.heading}>
          {heading}
        </EditableText>
        <EditableText path="home.purpose.body" as="p" className={styles.body}>
          {body}
        </EditableText>
        <EditableText path="home.purpose.vision" as="p" className={styles.vision}>
          {vision}
        </EditableText>
      </div>
    </section>
  );
}