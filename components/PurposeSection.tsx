"use client";

import EditableText from "@/components/cms/EditableText";
import ScrollWords from "@/components/motion/ScrollWords";
import styles from "./PurposeSection.module.scss";

interface Props {
  eyebrow: string;
  heading: string;
  body: string;
  vision: string;
}

// The manifesto, on ink: the purpose brightens line by line as it is read,
// then the four-verb vision slides across with the scroll.
export default function PurposeSection({ eyebrow, heading, body, vision }: Props) {
  return (
    <section className={styles.section} aria-labelledby="purpose-title">
      <div className={styles.inner}>
        <p className={styles.kicker}>
          <span>02</span>
          <EditableText path="home.purpose.eyebrow" as="span">
            {eyebrow}
          </EditableText>
        </p>
        <ScrollWords path="home.purpose.heading" text={heading} as="h2" className={styles.heading} />
        <EditableText path="home.purpose.body" as="p" className={`${styles.body} reveal`}>
          {body}
        </EditableText>
      </div>
      <div className={styles.visionWrap}>
        <EditableText path="home.purpose.vision" as="p" className={styles.vision}>
          {vision}
        </EditableText>
      </div>
      <span id="purpose-title" className="srOnly">{eyebrow}</span>
    </section>
  );
}
