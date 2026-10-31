"use client";

import EditableList from "@/components/cms/EditableList";
import EditableText from "@/components/cms/EditableText";
import type { Committee } from "@/content/types";
import styles from "./CommitteeGrid.module.scss";

interface Props {
  eyebrow: string;
  heading: string;
  items: Committee[];
}

// The committees as a table of contents on ink: names in display type,
// numbers hung in the margin.
export default function CommitteeGrid({ eyebrow, heading }: Props) {
  return (
    <section className={styles.section} aria-labelledby="committees-title">
      <div className={styles.inner}>
        <div className={styles.head}>
          <EditableText path="join.committees.eyebrow" as="p" className="eyebrow">
            {eyebrow}
          </EditableText>
          <EditableText path="join.committees.heading" as="h2" className={styles.heading} id="committees-title">
            {heading}
          </EditableText>
        </div>
        <EditableList
          path="join.committees.items"
          fields={[{ path: "name", as: "span" }]}
          addTemplate={{ name: "New committee" }}
          addLabel="Add committee"
          className={styles.list}
          renderItem={(item, index, controls) => (
            <div key={index} className={`${styles.item} reveal`}>
              <span className={styles.index} aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <EditableText path={`join.committees.items.${index}.name`} as="span" className={styles.name}>
                {String(item.name ?? "")}
              </EditableText>
              {controls}
            </div>
          )}
        />
      </div>
    </section>
  );
}
