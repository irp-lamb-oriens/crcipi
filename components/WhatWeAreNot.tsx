"use client";

import EditableText from "@/components/cms/EditableText";
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
        <EditableText path="about.not.eyebrow" as="p" className={styles.eyebrow}>
          {eyebrow}
        </EditableText>
        <EditableText path="about.not.heading" as="h2" className={styles.heading}>
          {heading}
        </EditableText>
        <ul className={styles.list}>
          {items.map((item, i) => (
            <li key={i} className={styles.item}>
              <EditableText path={`about.not.items.${i}`} as="span">
                {item}
              </EditableText>
            </li>
          ))}
        </ul>
        <EditableText path="about.not.positioning" as="p" className={styles.positioning}>
          {positioning}
        </EditableText>
      </div>
    </section>
  );
}