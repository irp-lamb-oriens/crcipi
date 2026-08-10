import Link from "next/link";
import type { Locale } from "@/content/types";
import styles from "./FoundingCallout.module.scss";

interface Props {
  locale: Locale;
  eyebrow: string;
  heading: string;
  body: string;
  cta: string;
}

export default function FoundingCallout({ locale, eyebrow, heading, body, cta }: Props) {
  const joinPath = locale === "en" ? "/en/join" : "/es/unete";

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.heading}>{heading}</h2>
        <p className={styles.body}>{body}</p>
        <Link href={`${joinPath}#form`} className={styles.cta}>
          {cta}
        </Link>
      </div>
    </section>
  );
}