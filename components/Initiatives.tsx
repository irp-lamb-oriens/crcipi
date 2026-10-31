"use client";

import EditableList from "@/components/cms/EditableList";
import EditableText from "@/components/cms/EditableText";
import { useCms } from "@/components/cms/CmsProvider";
import type { Initiative } from "@/content/types";
import styles from "./Initiatives.module.scss";

interface Props {
  eyebrow: string;
  heading: string;
  exampleLabel: string;
  memberValueLabel: string;
  items: Initiative[];
}

// An index, not a wall of text: eight numbered titles that open in place.
// Native <details> gives keyboard and screen-reader behaviour for free.
// In CMS edit mode every entry is open so all fields can be edited.
export default function Initiatives({ eyebrow, heading, exampleLabel, memberValueLabel }: Props) {
  const { editMode } = useCms();

  return (
    <section className={styles.section} aria-labelledby="initiatives-title">
      <div className={styles.inner}>
        <header className={styles.head}>
          <p className={styles.kicker}>
            <span>04</span>
            <EditableText path="home.initiatives.eyebrow" as="span">
              {eyebrow}
            </EditableText>
          </p>
          <EditableText path="home.initiatives.heading" as="h2" className={styles.heading} id="initiatives-title">
            {heading}
          </EditableText>
        </header>

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
            <details key={index} className={styles.item} open={editMode || undefined}>
              <summary className={styles.summary}>
                <span className={styles.index} aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className={styles.title}>
                  <EditableText path={`home.initiatives.items.${index}.title`} as="span">
                    {String(item.title ?? "")}
                  </EditableText>
                </h3>
                <span className={styles.icon} aria-hidden="true" />
              </summary>
              <div className={styles.content}>
                <EditableText path={`home.initiatives.items.${index}.body`} as="p" className={styles.body}>
                  {String(item.body ?? "")}
                </EditableText>
                <aside className={styles.example}>
                  <span className={styles.label}>
                    <EditableText path="home.initiatives.exampleLabel" as="span">
                      {exampleLabel}
                    </EditableText>
                  </span>
                  <EditableText path={`home.initiatives.items.${index}.example`} as="p">
                    {String(item.example ?? "")}
                  </EditableText>
                </aside>
                <p className={styles.value}>
                  <span className={styles.label}>
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
            </details>
          )}
        />
      </div>
    </section>
  );
}
