import type { LegalContent } from "@/content/types";
import EditableText from "@/components/cms/EditableText";
import styles from "./Listing.module.scss";

// Privacy policy and terms share one layout. Every string is CMS-editable so
// counsel's revisions don't require a deploy.
export default function LegalPage({ content, prefix }: { content: LegalContent; prefix: "privacy" | "terms" }) {
  return (
    <section className={styles.section}>
      <div className={`${styles.inner} ${styles.narrow}`}>
        <EditableText path={`${prefix}.eyebrow`} as="p" className={styles.eyebrow}>{content.eyebrow}</EditableText>
        <EditableText path={`${prefix}.heading`} as="h1" className={styles.rowTitle}
          style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)", textTransform: "uppercase", marginBottom: "0.75rem" }}>
          {content.heading}
        </EditableText>
        <EditableText path={`${prefix}.updated`} as="p" className={styles.hint}>{content.updated}</EditableText>
        <div className={styles.prose} style={{ marginTop: "2rem" }}>
          <EditableText path={`${prefix}.intro`} as="p" multiline>{content.intro}</EditableText>
          {content.sections.map((section, i) => (
            <div key={i}>
              <EditableText path={`${prefix}.sections.${i}.heading`} as="h2">{section.heading}</EditableText>
              {section.paragraphs.map((paragraph, j) => (
                <EditableText key={j} path={`${prefix}.sections.${i}.paragraphs.${j}`} as="p" multiline>
                  {paragraph}
                </EditableText>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
