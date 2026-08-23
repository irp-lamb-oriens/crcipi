"use client";

import EditableList from "@/components/cms/EditableList";
import EditableText from "@/components/cms/EditableText";
import type { InstitutionalPriority as PriorityType } from "@/content/types";
import styles from "./InstitutionalPriorities.module.scss";

interface Props {
  eyebrow: string;
  heading: string;
  items: PriorityType[];
}

export default function InstitutionalPriorities({ eyebrow, heading, items }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <EditableText path="about.priorities.eyebrow" as="p" className={styles.eyebrow}>
          {eyebrow}
        </EditableText>
        <EditableText path="about.priorities.heading" as="h2" className={styles.heading}>
          {heading}
        </EditableText>
        <EditableList
          path="about.priorities.items"
          fields={[
            { path: "title", as: "h3" },
            { path: "description", as: "p" },
          ]}
          addTemplate={{ title: "New priority", description: "" }}
          addLabel="Add priority"
          className={styles.list}
          renderItem={(item, index, controls) => (
            <div key={index} className={styles.item}>
              <span className={styles.index} aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className={styles.text}>
                <h3 className={styles.title}>
                  <EditableText path={`about.priorities.items.${index}.title`} as="span">
                    {String(item.title ?? "")}
                  </EditableText>
                </h3>
                <p className={styles.description}>
                  <EditableText
                    path={`about.priorities.items.${index}.description`}
                    as="span"
                  >
                    {String(item.description ?? "")}
                  </EditableText>
                </p>
              </div>
              {controls}
            </div>
          )}
        />
      </div>
    </section>
  );
}