import Image from "next/image";
import Link from "next/link";
import type { Locale, PageContent } from "@/content/types";
import { site } from "@/content/site";
import styles from "./SiteFooter.module.scss";
import logo from "@/app/logo.jpeg";

interface Props {
  locale: Locale;
  content: PageContent;
}

export default function SiteFooter({ locale, content }: Props) {
  const homePath = locale === "en" ? "/en" : "/es";
  const aboutPath = locale === "en" ? "/en/about" : "/es/quienes-somos";
  const joinPath = locale === "en" ? "/en/join" : "/es/unete";
  const otherLocale = locale === "en" ? "es" : "en";
  const otherHome = otherLocale === "en" ? "/en" : "/es";

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <Image
              src={logo}
              alt={site.name}
              className={styles.logoImage}
            />
            <p className={styles.purpose}>
              {locale === "en" ? site.fullName : site.fullNameEs}
            </p>
            <p className={styles.purposeLine}>{content.footer.purpose}</p>
          </div>

          <nav className={styles.links} aria-label="Footer">
            <Link href={homePath}>{content.nav.home}</Link>
            <Link href={aboutPath}>{content.nav.about}</Link>
            <Link href={joinPath}>{content.nav.join}</Link>
          </nav>

          <div className={styles.contact}>
            <span className={styles.contactLabel}>{content.footer.contact}</span>
            <a href={`mailto:${site.contactEmail}`} className={styles.contactEmail}>
              {site.contactEmail}
            </a>
            {site.linkedinUrl ? (
              <a
                href={site.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.contactLink}
              >
                {content.footer.linkedin}
              </a>
            ) : null}
          </div>
        </div>

        <div className={styles.formation}>
          <p>{content.footer.formation}</p>
        </div>

        <div className={styles.bottom}>
          <span>
            © {new Date().getFullYear()} {site.name}. {content.footer.rights}
          </span>
          <Link href={otherHome} className={styles.langLink}>
            {otherLocale === "en" ? "English" : "Español"}
          </Link>
        </div>
      </div>
    </footer>
  );
}