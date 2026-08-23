"use client";

import Link from "next/link";
import EditableText from "@/components/cms/EditableText";
import type { Locale } from "@/content/types";
import styles from "./SharedPurpose.module.scss";

interface Props {
  locale: Locale;
  eyebrow: string;
  heading: string;
  body: string[];
  cta: string;
}

export default function SharedPurpose({ locale, eyebrow, heading, body, cta }: Props) {
  const joinPath = locale === "en" ? "/en/join" : "/es/unete";

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <EditableText path="home.sharedPurpose.eyebrow" as="p" className={styles.eyebrow}>
          {eyebrow}
        </EditableText>
        <EditableText path="home.sharedPurpose.heading" as="h2" className={styles.heading}>
          {heading}
        </EditableText>
        {body.map((paragraph, i) => (
          <EditableText
            key={i}
            path={`home.sharedPurpose.body.${i}`}
            as="p"
            className={styles.body}
          >
            {paragraph}
          </EditableText>
        ))}
        <Link href={`${joinPath}#form`} className={styles.cta}>
          <EditableText path="home.sharedPurpose.cta" as="span">
            {cta}
          </EditableText>
        </Link>
      </div>
    </section>
  );
}