"use client";

import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/content/types";
import EditableText from "@/components/cms/EditableText";
import { site } from "@/content/site";
import styles from "./SiteFooter.module.scss";
import logo from "@/app/logo.png";

interface Props {
  locale: Locale;
}

export default function SiteFooter({ locale }: Props) {
  const homePath = locale === "en" ? "/en" : "/es";
  const aboutPath = locale === "en" ? "/en/about" : "/es/quienes-somos";
  const joinPath = locale === "en" ? "/en/join" : "/es/unete";
  const directoryPath = locale === "en" ? "/en/directory" : "/es/directorio";
  const jobsPath = locale === "en" ? "/en/jobs" : "/es/empleos";
  const privacyPath = locale === "en" ? "/en/privacy" : "/es/privacidad";
  const termsPath = locale === "en" ? "/en/terms" : "/es/terminos";
  const otherLocale = locale === "en" ? "es" : "en";
  const otherHome = otherLocale === "en" ? "/en" : "/es";

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <Image src={logo} alt={site.name} className={styles.logoImage} />
            <p className={styles.purpose}>
              {locale === "en" ? site.fullName : site.fullNameEs}
            </p>
            <p className={styles.purposeLine}>
              <EditableText path="footer.purpose" as="span" />
            </p>
          </div>

          <nav className={styles.links} aria-label="Footer">
            <Link href={homePath}>
              <EditableText path="nav.home" as="span" />
            </Link>
            <Link href={aboutPath}>
              <EditableText path="nav.about" as="span" />
            </Link>
            <Link href={joinPath}>
              <EditableText path="nav.join" as="span" />
            </Link>
            <Link href={directoryPath}>
              <EditableText path="nav.directory" as="span" />
            </Link>
            <Link href={jobsPath}>
              <EditableText path="nav.jobs" as="span" />
            </Link>
            <Link href={`/${locale}/blog`}>
              <EditableText path="nav.blog" as="span" />
            </Link>
          </nav>

          <div className={styles.contact}>
            <span className={styles.contactLabel}>
              <EditableText path="footer.contact" as="span" />
            </span>
            <a
              href={`mailto:${site.contactEmail}`}
              className={styles.contactEmail}
            >
              {site.contactEmail}
            </a>
            {site.linkedinUrl ? (
              <a
                href={site.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.contactLink}
              >
                <EditableText path="footer.linkedin" as="span" />
              </a>
            ) : null}
          </div>
        </div>

        <div className={styles.formation}>
          <p>
            <EditableText path="footer.formation" as="span" />
          </p>
        </div>

        <div className={styles.bottom}>
          <span>
            © {new Date().getFullYear()} {site.name}.{" "}
            <EditableText path="footer.rights" as="span" />
          </span>
          <span className={styles.legalLinks}>
            <Link href={privacyPath}>
              <EditableText path="nav.privacy" as="span" />
            </Link>
            <Link href={termsPath}>
              <EditableText path="nav.terms" as="span" />
            </Link>
          </span>
          <Link href={otherHome} className={styles.langLink}>
            {otherLocale === "en" ? "English" : "Español"}
          </Link>
        </div>
      </div>
    </footer>
  );
}