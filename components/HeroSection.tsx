"use client";

import Link from "next/link";
import type { Locale } from "@/content/types";
import EditableText from "@/components/cms/EditableText";
import styles from "./HeroSection.module.scss";

interface Props {
  locale: Locale;
  eyebrow: string;
  headline: string;
  body: string;
  primaryCta: string;
  secondaryCta: string;
}

export default function HeroSection({
  locale,
  eyebrow,
  headline,
  body,
  primaryCta,
  secondaryCta,
}: Props) {
  const joinPath = locale === "en" ? "/en/join" : "/es/unete";

  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <EditableText path="home.hero.eyebrow" as="p" className={styles.eyebrow}>
          {eyebrow}
        </EditableText>
        <EditableText path="home.hero.headline" as="h1" className={styles.headline}>
          {headline}
        </EditableText>
        <EditableText path="home.hero.body" as="p" className={styles.body}>
          {body}
        </EditableText>
        <div className={styles.actions}>
          <Link href={`${joinPath}#form`} className={styles.primary}>
            <EditableText path="home.hero.primaryCta" as="span">
              {primaryCta}
            </EditableText>
          </Link>
          <Link href={joinPath} className={styles.secondary}>
            <EditableText path="home.hero.secondaryCta" as="span">
              {secondaryCta}
            </EditableText>
          </Link>
        </div>
      </div>
    </section>
  );
}