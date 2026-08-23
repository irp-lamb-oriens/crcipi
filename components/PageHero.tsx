"use client";

import EditableText from "@/components/cms/EditableText";
import styles from "./PageHero.module.scss";

interface Props {
  pathPrefix: string;
  eyebrow: string;
  heading: string;
  body?: string[];
}

export default function PageHero({ pathPrefix, eyebrow, heading, body }: Props) {
  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <EditableText path={`${pathPrefix}.eyebrow`} as="p" className={styles.eyebrow}>
          {eyebrow}
        </EditableText>
        <EditableText path={`${pathPrefix}.heading`} as="h1" className={styles.heading}>
          {heading}
        </EditableText>
        {body && body.length > 0 && (
          <div className={styles.body}>
            {body.map((paragraph, i) => (
              <EditableText
                key={i}
                path={`${pathPrefix}.body.${i}`}
                as="p"
              >
                {paragraph}
              </EditableText>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}