"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getLocalizedPath, getAlternateLocale } from "@/lib/i18n";
import type { Locale } from "@/content/types";
import styles from "./LanguageSwitcher.module.scss";

interface Props {
  currentLocale: Locale;
}

const LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

export default function LanguageSwitcher({ currentLocale }: Props) {
  const pathname = usePathname();
  const target = getAlternateLocale(currentLocale);
  const href = getLocalizedPath(pathname, target);

  return (
    <nav className={styles.switcher} aria-label="Language">
      <span className={`${styles.option} ${styles.current}`} aria-current="true">
        {LABELS[currentLocale]}
      </span>
      <Link
        href={href}
        className={styles.option}
        hrefLang={target}
        aria-label={target === "en" ? "Switch to English" : "Cambiar a español"}
      >
        {LABELS[target]}
      </Link>
    </nav>
  );
}