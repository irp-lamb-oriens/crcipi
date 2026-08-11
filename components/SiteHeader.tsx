import Image from "next/image";
import Link from "next/link";
import type { Locale, PageContent } from "@/content/types";
import LanguageSwitcher from "./LanguageSwitcher";
import styles from "./SiteHeader.module.scss";
import logo from "@/app/logo.jpeg";

interface Props {
  locale: Locale;
  content: PageContent;
}

export default function SiteHeader({ locale, content }: Props) {
  const joinPath = locale === "en" ? "/en/join" : "/es/unete";

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href={locale === "en" ? "/en" : "/es"} className={styles.logo} aria-label="CR-CIPI home">
          <Image
            src={logo}
            alt="CR-CIPI"
            className={styles.logoImage}
            priority
          />
        </Link>

        <nav className={styles.nav} aria-label="Main">
          <Link href={locale === "en" ? "/en" : "/es"} className={styles.navLink}>
            {content.nav.home}
          </Link>
          <Link
            href={locale === "en" ? "/en/about" : "/es/quienes-somos"}
            className={styles.navLink}
          >
            {content.nav.about}
          </Link>
          <Link href={joinPath} className={styles.navLink}>
            {content.nav.join}
          </Link>
        </nav>

        <div className={styles.actions}>
          <LanguageSwitcher currentLocale={locale} />
          <Link href={`${joinPath}#form`} className={styles.cta}>
            {content.nav.volunteer}
          </Link>
        </div>
      </div>
    </header>
  );
}