"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getLocalizedPath, getAlternateLocale } from "@/lib/i18n";
import type { Locale } from "@/content/types";
import styles from "./LanguageSwitcher.module.scss";

interface Props {
  currentLocale: Locale;
}

export default function LanguageSwitcher({ currentLocale }: Props) {
  const pathname = usePathname();
  const target = getAlternateLocale(currentLocale);
  const href = getLocalizedPath(pathname, target);

  return (
    <nav className={styles.switcher} aria-label="Language">
      <Link
        href={href}
        className={styles.link}
        hrefLang={target}
        aria-label={target === "en" ? "Switch to English" : "Cambiar a español"}
      >
        {target === "en" ? "EN" : "ES"}
      </Link>
    </nav>
  );
}