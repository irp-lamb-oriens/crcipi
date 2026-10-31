"use client";

import Link from "next/link";
import type { Locale } from "@/content/types";
import EditableText from "@/components/cms/EditableText";
import Seal from "@/components/brand/Seal";
import { pagePath } from "@/lib/i18n";
import styles from "./HeroSection.module.scss";

interface Props {
  locale: Locale;
  eyebrow: string;
  headline: string;
  body: string;
  primaryCta: string;
  secondaryCta: string;
}

// Cold open: the promise in display type at extreme scale, one red action,
// a quiet secondary link, and the seal that turns as the visitor reads on.
// The headline is real text painted at first frame (LCP-safe); it only
// slides inside its own mask.
export default function HeroSection({ locale, eyebrow, headline, body, primaryCta, secondaryCta }: Props) {
  const joinPath = pagePath("join", locale);
  const aboutPath = pagePath("about", locale);

  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.inner}>
        <p className={styles.kicker}>
          <span className={styles.index}>01</span>
          <EditableText path="home.hero.eyebrow" as="span">
            {eyebrow}
          </EditableText>
        </p>

        <h1 id="hero-title" className={styles.headline}>
          <span className="lineMask">
            <EditableText path="home.hero.headline" as="span">
              {headline}
            </EditableText>
          </span>
        </h1>

        <div className={styles.foot}>
          <EditableText path="home.hero.body" as="p" className={styles.body}>
            {body}
          </EditableText>

          <div className={styles.actions}>
            <Link href={`${joinPath}#form`} className="btn btn--primary">
              <EditableText path="home.hero.primaryCta" as="span">
                {primaryCta}
              </EditableText>
              <span className="btn__arrow" aria-hidden="true">→</span>
            </Link>
            <Link href={aboutPath} className={styles.secondary}>
              <EditableText path="home.hero.secondaryCta" as="span">
                {secondaryCta}
              </EditableText>
            </Link>
          </div>
        </div>

        <Seal id="hero" size="lg" className={styles.seal} label="CR-CIPI trust seal" />
      </div>
    </section>
  );
}
