"use client";

import EditableList from "@/components/cms/EditableList";
import EditableText from "@/components/cms/EditableText";
import type { ParticipationOption } from "@/content/types";
import styles from "./ParticipationCards.module.scss";

interface Props {
  eyebrow: string;
  heading: string;
  options: ParticipationOption[];
}

// Five doors in, side by side like ledger columns; each one opens onto the
// form below. On phones they become a swipeable row with snap points.
export default function ParticipationCards({ eyebrow, heading }: Props) {
  return (
    <section className={styles.section} aria-labelledby="ways-title">
      <div className={styles.inner}>
        <div className={styles.head}>
          <EditableText path="join.participation.eyebrow" as="p" className="eyebrow">
            {eyebrow}
          </EditableText>
          <EditableText path="join.participation.heading" as="h2" className={styles.heading} id="ways-title">
            {heading}
          </EditableText>
        </div>
        <EditableList
          path="join.participation.options"
          fields={[
            { path: "title", as: "h3" },
            { path: "purpose", as: "p" },
          ]}
          addTemplate={{ title: "New option", purpose: "" }}
          addLabel="Add option"
          className={styles.row}
          renderItem={(item, index, controls) => (
            <article key={index} className={styles.card}>
              <span className={styles.index} aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className={styles.title}>
                <EditableText path={`join.participation.options.${index}.title`} as="span">
                  {String(item.title ?? "")}
                </EditableText>
              </h3>
              <p className={styles.purpose}>
                <EditableText path={`join.participation.options.${index}.purpose`} as="span">
                  {String(item.purpose ?? "")}
                </EditableText>
              </p>
              <a href="#form" className={styles.go} aria-hidden="true" tabIndex={-1}>
                ↓
              </a>
              {controls}
            </article>
          )}
        />
      </div>
    </section>
  );
}
