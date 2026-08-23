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

export default function CommitteeGrid({ eyebrow, heading, items }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <EditableText path="join.committees.eyebrow" as="p" className={styles.eyebrow}>
          {eyebrow}
        </EditableText>
        <EditableText path="join.committees.heading" as="h2" className={styles.heading}>
          {heading}
        </EditableText>
        <EditableList
          path="join.committees.items"
          fields={[{ path: "name", as: "span" }]}
          addTemplate={{ name: "New committee" }}
          addLabel="Add committee"
          className={styles.grid}
          renderItem={(item, index, controls) => (
            <div key={index} className={styles.item}>
              <span className={styles.index} aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className={styles.name}>
                <EditableText path={`join.committees.items.${index}.name`} as="span">
                  {String(item.name ?? "")}
                </EditableText>
              </span>
              {controls}
            </div>
          )}
        />
      </div>
    </section>
  );
}