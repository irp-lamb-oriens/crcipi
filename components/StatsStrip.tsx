"use client";

import EditableList from "@/components/cms/EditableList";
import EditableText from "@/components/cms/EditableText";
import type { Stat } from "@/content/types";
import styles from "./StatsStrip.module.scss";

interface Props {
  items: Stat[];
}

export default function StatsStrip({ items }: Props) {
  return (
    <section className={styles.section} aria-label="Founding stats">
      <div className={styles.inner}>
        <EditableList
          path="home.stats.items"
          fields={[
            { path: "value", as: "dt" },
            { path: "label", as: "dd" },
          ]}
          addTemplate={{ value: "0", label: "New stat" }}
          addLabel="Add stat"
          className={styles.list}
          renderItem={(item, index, controls) => (
            <div key={index} className={styles.item}>
              <span className={styles.value}>
                <EditableText path={`home.stats.items.${index}.value`} as="span">
                  {String(item.value ?? "")}
                </EditableText>
              </span>
              <span className={styles.label}>
                <EditableText path={`home.stats.items.${index}.label`} as="span">
                  {String(item.label ?? "")}
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