"use client";

import { useState } from "react";
import Link from "next/link";
import type { Locale } from "@/content/types";
import EditableText from "@/components/cms/EditableText";
import Seal from "@/components/brand/Seal";
import { site } from "@/content/site";
import { pagePath } from "@/lib/i18n";
import styles from "./SiteFooter.module.scss";

interface Props {
  locale: Locale;
}

const T = {
  en: { explore: "Explore", members: "Members", contact: "Contact", signIn: "Member sign in", copy: "Copy email", copied: "Copied", place: "San José, Costa Rica" },
  es: { explore: "Explorar", members: "Miembros", contact: "Contacto", signIn: "Acceso de miembros", copy: "Copiar correo", copied: "Copiado", place: "San José, Costa Rica" },
};

// The finale: purpose restated, the one CTA repeated, a real sitemap, and an
// edge-to-edge wordmark fitted with SVG textLength (never overflows).
export default function SiteFooter({ locale }: Props) {
  const t = T[locale];
  const [copied, setCopied] = useState(false);
  const joinPath = pagePath("join", locale);
  const otherLocale: Locale = locale === "en" ? "es" : "en";

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(site.contactEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.location.href = `mailto:${site.contactEmail}`;
    }
  }

  return (
    <footer id="site-footer" className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.finale}>
          <EditableText path="footer.purpose" as="p" className={styles.purpose} />
          <div className={styles.finaleActions}>
            <Link href={`${joinPath}#form`} className="btn btn--primary">
              <EditableText path="nav.volunteer" as="span" />
              <span className="btn__arrow" aria-hidden="true">→</span>
            </Link>
            <Seal id="footer" size="md" tone="on-dark" label="CR-CIPI trust seal" />
          </div>
        </div>

        <div className={styles.map}>
          <nav aria-label={t.explore} className={styles.col}>
            <h2 className={styles.colTitle}>{t.explore}</h2>
            <ul>
              {(["home", "about", "join", "directory", "jobs", "blog"] as const).map((key) => (
                <li key={key}>
                  <Link href={pagePath(key, locale)}>
                    <EditableText path={`nav.${key}`} as="span" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className={styles.col}>
            <h2 className={styles.colTitle}>{t.members}</h2>
            <ul>
              <li>
                <Link href="/admin">{t.signIn}</Link>
              </li>
              <li>
                <Link href={`${joinPath}#form`}>
                  <EditableText path="nav.volunteer" as="span" />
                </Link>
              </li>
            </ul>
          </div>
          <div className={styles.col}>
            <h2 className={styles.colTitle}>
              <EditableText path="footer.contact" as="span" />
            </h2>
            <ul>
              <li className={styles.emailRow}>
                <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
                <button type="button" className={styles.copy} onClick={() => void copyEmail()} aria-live="polite">
                  {copied ? t.copied : t.copy}
                </button>
              </li>
              {site.linkedinUrl ? (
                <li>
                  <a href={site.linkedinUrl} target="_blank" rel="noopener noreferrer">
                    <EditableText path="footer.linkedin" as="span" />
                  </a>
                </li>
              ) : null}
              <li className={styles.place}>{t.place} · 9.93° N, 84.08° W</li>
            </ul>
          </div>
        </div>

        <p className={styles.formation}>
          <EditableText path="footer.formation" as="span" />
        </p>
      </div>

      <svg className={styles.wordmark} viewBox="0 0 1000 190" role="img" aria-label="CR-CIPI">
        <text x="0" y="170" textLength="1000" lengthAdjust="spacingAndGlyphs">
          CR-CIPI
        </text>
      </svg>

      <div className={styles.legal}>
        <span>
          © {new Date().getFullYear()} {site.name}. <EditableText path="footer.rights" as="span" />
        </span>
        <span className={styles.legalLinks}>
          <Link href={pagePath("privacy", locale)}>
            <EditableText path="nav.privacy" as="span" />
          </Link>
          <Link href={pagePath("terms", locale)}>
            <EditableText path="nav.terms" as="span" />
          </Link>
          <Link href={pagePath("home", otherLocale)} hrefLang={otherLocale} lang={otherLocale}>
            {otherLocale === "en" ? "English" : "Español"}
          </Link>
        </span>
      </div>
    </footer>
  );
}
