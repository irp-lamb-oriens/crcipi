"use client";

import EditableList from "@/components/cms/EditableList";
import EditableText from "@/components/cms/EditableText";
import type { FoundingGoal } from "@/content/types";
import styles from "./FoundingGoals.module.scss";

interface Props {
  eyebrow: string;
  heading: string;
  items: FoundingGoal[];
}

export default function FoundingGoals({ eyebrow, heading, items }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <EditableText path="join.goals.eyebrow" as="p" className={styles.eyebrow}>
          {eyebrow}
        </EditableText>
        <EditableText path="join.goals.heading" as="h2" className={styles.heading}>
          {heading}
        </EditableText>
        <EditableList
          path="join.goals.items"
          fields={[
            { path: "metric", as: "dt" },
            { path: "target", as: "dd" },
          ]}
          addTemplate={{ metric: "0", target: "New goal" }}
          addLabel="Add goal"
          className={styles.list}
          renderItem={(item, index, controls) => (
            <div key={index} className={styles.item}>
              <span className={styles.metric}>
                <EditableText path={`join.goals.items.${index}.metric`} as="span">
                  {String(item.metric ?? "")}
                </EditableText>
              </span>
              <span className={styles.target}>
                <EditableText path={`join.goals.items.${index}.target`} as="span">
                  {String(item.target ?? "")}
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