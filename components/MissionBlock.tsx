"use client";

import EditableText from "@/components/cms/EditableText";
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
        <EditableText path="about.mission.eyebrow" as="p" className={styles.eyebrow}>
          {eyebrow}
        </EditableText>
        <EditableText path="about.mission.heading" as="h2" className={styles.heading}>
          {heading}
        </EditableText>
        <EditableText path="about.mission.body" as="p" className={styles.body}>
          {body}
        </EditableText>
      </div>
    </section>
  );
}