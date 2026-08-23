"use client";

import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/content/types";
import EditableText from "@/components/cms/EditableText";
import LanguageSwitcher from "./LanguageSwitcher";
import styles from "./SiteHeader.module.scss";
import logo from "@/app/logo.png";

interface Props {
  locale: Locale;
}

export default function SiteHeader({ locale }: Props) {
  const joinPath = locale === "en" ? "/en/join" : "/es/unete";
  const homePath = locale === "en" ? "/en" : "/es";

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href={homePath} className={styles.logo} aria-label="CR-CIPI home">
          <Image
            src={logo}
            alt="CR-CIPI"
            className={styles.logoImage}
            priority
          />
        </Link>

        <nav className={styles.nav} aria-label="Main">
          <Link href={homePath} className={styles.navLink}>
            <EditableText path="nav.home" as="span" />
          </Link>
          <Link
            href={locale === "en" ? "/en/about" : "/es/quienes-somos"}
            className={styles.navLink}
          >
            <EditableText path="nav.about" as="span" />
          </Link>
          <Link href={joinPath} className={styles.navLink}>
            <EditableText path="nav.join" as="span" />
          </Link>
        </nav>

        <div className={styles.actions}>
          <LanguageSwitcher currentLocale={locale} />
          <Link href={`${joinPath}#form`} className={styles.cta}>
            <EditableText path="nav.volunteer" as="span" />
          </Link>
        </div>
      </div>
    </header>
  );
}