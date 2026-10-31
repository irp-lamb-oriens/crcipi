"use client";

import EditableText from "@/components/cms/EditableText";
import styles from "./WhatWeAreNot.module.scss";

interface Props {
  eyebrow: string;
  heading: string;
  items: string[];
  positioning: string;
}

// Defined by negation: each "not" is struck through as it scrolls into view,
// then the positive statement lands in italic. The strike is decoration;
// the words stay fully legible and are read normally by screen readers.
export default function WhatWeAreNot({ eyebrow, heading, items, positioning }: Props) {
  return (
    <section className={styles.section} aria-labelledby="not-title">
      <div className={styles.inner}>
        <div className={styles.head}>
          <EditableText path="about.not.eyebrow" as="p" className="eyebrow">
            {eyebrow}
          </EditableText>
          <EditableText path="about.not.heading" as="h2" className={styles.heading} id="not-title">
            {heading}
          </EditableText>
        </div>
        <ul className={styles.list}>
          {items.map((item, i) => (
            <li key={i} className={styles.item}>
              <span className={styles.x} aria-hidden="true">✕</span>
              <EditableText path={`about.not.items.${i}`} as="span" className={styles.text}>
                {item}
              </EditableText>
            </li>
          ))}
        </ul>
        <EditableText path="about.not.positioning" as="p" className={`${styles.positioning} reveal`}>
          {positioning}
        </EditableText>
      </div>
    </section>
  );
}
