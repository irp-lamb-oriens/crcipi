"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getLocalizedPath } from "@/lib/i18n";
import type { Locale } from "@/content/types";
import styles from "./LanguageSwitcher.module.scss";

interface Props {
  currentLocale: Locale;
}

// Fixed display order: EN first, ES second. The active state is drawn by the
// sliding indicator, so the items never swap positions on toggle.
const OPTIONS: Locale[] = ["en", "es"];
const CODES: Record<Locale, string> = {
  en: "EN",
  es: "ES",
};
const FULL_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

export default function LanguageSwitcher({ currentLocale }: Props) {
  const pathname = usePathname();
  const isEs = currentLocale === "es";

  return (
    <nav
      className={`${styles.switcher}${isEs ? ` ${styles.es}` : ""}`}
      aria-label="Language"
    >
      <span aria-hidden="true" className={styles.indicator} />
      {OPTIONS.map((locale) => {
        const isCurrent = locale === currentLocale;
        const href = getLocalizedPath(pathname, locale);

        if (isCurrent) {
          return (
            <span
              key={locale}
              className={`${styles.option} ${styles.current}`}
              aria-current="true"
              lang={locale}
            >
              {CODES[locale]}
            </span>
          );
        }

        return (
          <Link
            key={locale}
            href={href}
            className={styles.option}
            hrefLang={locale}
            lang={locale}
            title={FULL_NAMES[locale]}
            aria-label={locale === "en" ? "Switch to English" : "Cambiar a español"}
          >
            {CODES[locale]}
          </Link>
        );
      })}
    </nav>
  );
}