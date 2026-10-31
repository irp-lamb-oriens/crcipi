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

// Founding goals as a compact ledger: the proof that sits right next to the
// form, where hesitation happens.
export default function FoundingGoals({ eyebrow, heading }: Props) {
  return (
    <div className={styles.block}>
      <EditableText path="join.goals.eyebrow" as="p" className="eyebrow">
        {eyebrow}
      </EditableText>
      <EditableText path="join.goals.heading" as="h3" className={styles.heading}>
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
            <EditableText path={`join.goals.items.${index}.metric`} as="span" className={styles.metric}>
              {String(item.metric ?? "")}
            </EditableText>
            <EditableText path={`join.goals.items.${index}.target`} as="span" className={styles.target}>
              {String(item.target ?? "")}
            </EditableText>
            {controls}
          </div>
        )}
      />
    </div>
  );
}
