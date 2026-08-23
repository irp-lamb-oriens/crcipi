"use client";

import EditableList from "@/components/cms/EditableList";
import EditableText from "@/components/cms/EditableText";
import type { Initiative } from "@/content/types";
import styles from "./Initiatives.module.scss";

interface Props {
  eyebrow: string;
  heading: string;
  exampleLabel: string;
  memberValueLabel: string;
  items: Initiative[];
}

export default function Initiatives({
  eyebrow,
  heading,
  exampleLabel,
  memberValueLabel,
  items,
}: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <EditableText path="home.initiatives.eyebrow" as="p" className={styles.eyebrow}>
          {eyebrow}
        </EditableText>
        <EditableText path="home.initiatives.heading" as="h2" className={styles.heading}>
          {heading}
        </EditableText>

        <EditableList
          path="home.initiatives.items"
          fields={[
            { path: "title", as: "h3" },
            { path: "body", as: "p" },
            { path: "example", as: "p" },
            { path: "memberValue", as: "p" },
          ]}
          addTemplate={{ title: "New initiative", body: "", example: "", memberValue: "" }}
          addLabel="Add initiative"
          className={styles.list}
          renderItem={(item, index, controls) => (
            <article key={index} className={styles.item}>
              <div className={styles.index} aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className={styles.content}>
                <h3 className={styles.title}>
                  <EditableText path={`home.initiatives.items.${index}.title`} as="span">
                    {String(item.title ?? "")}
                  </EditableText>
                </h3>
                <p className={styles.body}>
                  <EditableText path={`home.initiatives.items.${index}.body`} as="span">
                    {String(item.body ?? "")}
                  </EditableText>
                </p>
                <div className={styles.example}>
                  <span className={styles.exampleLabel}>
                    <EditableText path="home.initiatives.exampleLabel" as="span">
                      {exampleLabel}
                    </EditableText>
                  </span>
                  <p className={styles.exampleText}>
                    <EditableText path={`home.initiatives.items.${index}.example`} as="span">
                      {String(item.example ?? "")}
                    </EditableText>
                  </p>
                </div>
                <p className={styles.memberValue}>
                  <span className={styles.memberLabel}>
                    <EditableText path="home.initiatives.memberValueLabel" as="span">
                      {memberValueLabel}
                    </EditableText>
                  </span>
                  <EditableText path={`home.initiatives.items.${index}.memberValue`} as="span">
                    {String(item.memberValue ?? "")}
                  </EditableText>
                </p>
              </div>
              {controls}
            </article>
          )}
        />
      </div>
    </section>
  );
}