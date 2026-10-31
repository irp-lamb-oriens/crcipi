"use client";

import Link from "next/link";
import EditableText from "@/components/cms/EditableText";
import type { Locale } from "@/content/types";
import { pagePath } from "@/lib/i18n";
import styles from "./SharedPurpose.module.scss";

interface Props {
  locale: Locale;
  eyebrow: string;
  heading: string;
  body: string[];
  cta: string;
}

// The argument, set like an editorial spread: a statement across the full
// measure, three numbered columns, then the single action.
export default function SharedPurpose({ locale, eyebrow, heading, body, cta }: Props) {
  const joinPath = pagePath("join", locale);

  return (
    <section className={styles.section} aria-labelledby="shared-title">
      <div className={styles.inner}>
        <p className={styles.kicker}>
          <span>05</span>
          <EditableText path="home.sharedPurpose.eyebrow" as="span">
            {eyebrow}
          </EditableText>
        </p>
        <EditableText path="home.sharedPurpose.heading" as="h2" className={styles.heading} id="shared-title">
          {heading}
        </EditableText>
        <ol className={styles.columns}>
          {body.map((paragraph, i) => (
            <li key={i} className="reveal" style={{ animationDelay: `${i * 80}ms` }}>
              <span className={styles.num} aria-hidden="true">
                {["i", "ii", "iii", "iv", "v"][i] ?? i + 1}
              </span>
              <EditableText path={`home.sharedPurpose.body.${i}`} as="p">
                {paragraph}
              </EditableText>
            </li>
          ))}
        </ol>
        <Link href={`${joinPath}#form`} className={`btn btn--primary ${styles.cta}`}>
          <EditableText path="home.sharedPurpose.cta" as="span">
            {cta}
          </EditableText>
          <span className="btn__arrow" aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
