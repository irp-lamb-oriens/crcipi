"use client";

import EditableText from "@/components/cms/EditableText";
import styles from "./PageHero.module.scss";

interface Props {
  pathPrefix: string;
  eyebrow: string;
  heading: string;
  body?: string[];
  /** Optional visual placed opposite the heading (seal, counters…). */
  aside?: React.ReactNode;
  /** Tone of the band: paper (default) or ink. */
  tone?: "paper" | "ink";
}

// Shared interior-page opener: chapter marker, display heading in its line
// mask, and the intro set in a narrower right column.
export default function PageHero({ pathPrefix, eyebrow, heading, body, aside, tone = "paper" }: Props) {
  return (
    <section className={`${styles.hero} ${tone === "ink" ? styles.ink : ""}`}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <EditableText path={`${pathPrefix}.eyebrow`} as="p" className="eyebrow">
            {eyebrow}
          </EditableText>
          {aside ? <div className={styles.aside}>{aside}</div> : null}
        </div>
        <h1 className={styles.heading}>
          <span className="lineMask">
            <EditableText path={`${pathPrefix}.heading`} as="span">
              {heading}
            </EditableText>
          </span>
        </h1>
        {body && body.length > 0 && (
          <div className={`${styles.body} ${body.length > 1 ? styles.multi : ""}`}>
            {body.map((paragraph, i) => (
              <EditableText key={i} path={`${pathPrefix}.body.${i}`} as="p">
                {paragraph}
              </EditableText>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
