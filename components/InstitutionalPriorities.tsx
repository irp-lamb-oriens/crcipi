"use client";

import EditableList from "@/components/cms/EditableList";
import EditableText from "@/components/cms/EditableText";
import { useCms } from "@/components/cms/CmsProvider";
import type { InstitutionalPriority as PriorityType } from "@/content/types";
import styles from "./InstitutionalPriorities.module.scss";

interface Props {
  eyebrow: string;
  heading: string;
  items: PriorityType[];
}

// Five priorities as pages of a passport: each card sticks and the next one
// slides over it, leaving the previous card's tab visible. Plain stacked
// cards on phones, in reduced motion, and in CMS edit mode.
export default function InstitutionalPriorities({ eyebrow, heading, items }: Props) {
  const { editMode } = useCms();
  return (
    <section className={styles.section} aria-labelledby="priorities-title">
      <div className={styles.inner}>
        <header className={styles.head}>
          <EditableText path="about.priorities.eyebrow" as="p" className="eyebrow">
            {eyebrow}
          </EditableText>
          <EditableText path="about.priorities.heading" as="h2" className={styles.heading} id="priorities-title">
            {heading}
          </EditableText>
        </header>
        <EditableList
          path="about.priorities.items"
          fields={[
            { path: "title", as: "h3" },
            { path: "description", as: "p" },
          ]}
          addTemplate={{ title: "New priority", description: "" }}
          addLabel="Add priority"
          className={`${styles.stack} ${editMode ? styles.flat : ""}`}
          renderItem={(item, index, controls) => (
            <article
              key={index}
              className={styles.card}
              style={{ "--i": index, "--n": items.length } as React.CSSProperties}
            >
              <span className={styles.tab}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span aria-hidden="true">/ {String(items.length).padStart(2, "0")}</span>
              </span>
              <h3 className={styles.title}>
                <EditableText path={`about.priorities.items.${index}.title`} as="span">
                  {String(item.title ?? "")}
                </EditableText>
              </h3>
              <p className={styles.description}>
                <EditableText path={`about.priorities.items.${index}.description`} as="span">
                  {String(item.description ?? "")}
                </EditableText>
              </p>
              {controls}
            </article>
          )}
        />
      </div>
    </section>
  );
}
