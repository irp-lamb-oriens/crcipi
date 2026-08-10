import Link from "next/link";
import type { Locale } from "@/content/types";
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
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.headline}>{headline}</h1>
        <p className={styles.body}>{body}</p>
        <div className={styles.actions}>
          <Link href={`${joinPath}#form`} className={styles.primary}>
            {primaryCta}
          </Link>
          <Link href={joinPath} className={styles.secondary}>
            {secondaryCta}
          </Link>
        </div>
      </div>
    </section>
  );
}