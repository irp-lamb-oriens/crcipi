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

export default function ParticipationCards({ eyebrow, heading, options }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <EditableText path="join.participation.eyebrow" as="p" className={styles.eyebrow}>
          {eyebrow}
        </EditableText>
        <EditableText path="join.participation.heading" as="h2" className={styles.heading}>
          {heading}
        </EditableText>
        <EditableList
          path="join.participation.options"
          fields={[
            { path: "title", as: "h3" },
            { path: "purpose", as: "p" },
          ]}
          addTemplate={{ title: "New option", purpose: "" }}
          addLabel="Add option"
          className={styles.grid}
          renderItem={(item, index, controls) => (
            <div key={index} className={styles.card}>
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
              {controls}
            </div>
          )}
        />
      </div>
    </section>
  );
}