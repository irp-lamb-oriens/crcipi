"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/content/types";
import EditableText from "@/components/cms/EditableText";
import { useCms } from "@/components/cms/CmsProvider";
import { getPageKey, pagePath, type PageKey } from "@/lib/i18n";
import LanguageSwitcher from "./LanguageSwitcher";
import MemberMenu from "./MemberMenu";
import styles from "./SiteHeader.module.scss";
import logo from "@/app/logo.png";

interface Props {
  locale: Locale;
}

const NAV: { key: PageKey; path: string }[] = [
  { key: "about", path: "nav.about" },
  { key: "join", path: "nav.join" },
  { key: "directory", path: "nav.directory" },
  { key: "jobs", path: "nav.jobs" },
  { key: "blog", path: "nav.blog" },
];

const MENU_LABEL: Record<Locale, { open: string; close: string }> = {
  en: { open: "Menu", close: "Close" },
  es: { open: "Menú", close: "Cerrar" },
};

// Minimal header: hides while reading down, returns on the first scroll up
// or as soon as keyboard focus enters it. Below 1080px the links move into a
// full-screen disclosure menu that makes the page inert behind it.
export default function SiteHeader({ locale }: Props) {
  const pathname = usePathname();
  const active = getPageKey(pathname);
  const { getValue } = useCms();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const joinPath = pagePath("join", locale);

  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 8);
        setHidden(y > 240 && y > last + 4);
        if (y < last - 4) setHidden(false);
        last = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    toggleRef.current?.focus();
  }, []);

  // Menu open: lock scroll, make the rest of the page inert, focus the first
  // link, close on Escape.
  useEffect(() => {
    const siblings = [document.getElementById("main"), document.getElementById("site-footer")];
    siblings.forEach((el) => el && (el.inert = open));
    document.documentElement.style.overflow = open ? "hidden" : "";
    if (open) panelRef.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    if (open) window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      siblings.forEach((el) => el && (el.inert = false));
      document.documentElement.style.overflow = "";
    };
  }, [open, close]);

  // Navigating closes the menu.
  useEffect(() => setOpen(false), [pathname]);

  const label = (path: string) => String(getValue(path) ?? "");

  return (
    <>
      <a href="#main" className="skipLink">
        {locale === "en" ? "Skip to content" : "Saltar al contenido"}
      </a>
      <header
        className={`${styles.header} ${scrolled ? styles.scrolled : ""} ${hidden && !open ? styles.hidden : ""} ${open ? styles.menuOpen : ""}`}
        onFocusCapture={() => setHidden(false)}
      >
        <div className={styles.inner}>
          <Link href={pagePath("home", locale)} className={styles.logo} aria-label="CR-CIPI, home">
            <Image src={logo} alt="" className={styles.logoImage} priority sizes="120px" />
          </Link>

          <nav className={styles.nav} aria-label={locale === "en" ? "Main" : "Principal"}>
            <ul>
              {NAV.map((item) => (
                <li key={item.key}>
                  <Link
                    href={pagePath(item.key, locale)}
                    className={styles.navLink}
                    aria-current={active === item.key ? "page" : undefined}
                  >
                    <EditableText path={item.path} as="span" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className={styles.actions}>
            <LanguageSwitcher currentLocale={locale} />
            <span className={styles.member}>
              <MemberMenu locale={locale} />
            </span>
            <Link href={`${joinPath}#form`} className={`btn btn--primary ${styles.cta}`}>
              <EditableText path="nav.volunteer" as="span" />
            </Link>
            <button
              ref={toggleRef}
              type="button"
              className={styles.toggle}
              aria-expanded={open}
              aria-controls="site-menu"
              onClick={() => setOpen((v) => !v)}
            >
              <span>{open ? MENU_LABEL[locale].close : MENU_LABEL[locale].open}</span>
              <span className={`${styles.burger} ${open ? styles.burgerOpen : ""}`} aria-hidden="true">
                <i />
                <i />
              </span>
            </button>
          </div>
        </div>
      </header>

      <div
        id="site-menu"
        ref={panelRef}
        className={`${styles.panel} ${open ? styles.panelOpen : ""}`}
        hidden={!open}
      >
        <nav aria-label={locale === "en" ? "Menu" : "Menú"}>
          <ol className={styles.panelList}>
            {[{ key: "home" as PageKey, path: "nav.home" }, ...NAV].map((item, i) => (
              <li key={item.key} style={{ "--i": i } as React.CSSProperties}>
                <Link
                  href={pagePath(item.key, locale)}
                  className={styles.panelLink}
                  aria-current={active === item.key ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  <span className={styles.panelIndex}>{String(i + 1).padStart(2, "0")}</span>
                  {label(item.path)}
                </Link>
              </li>
            ))}
          </ol>
        </nav>
        <div className={styles.panelFoot}>
          <MemberMenu locale={locale} />
          <Link href={`${joinPath}#form`} className="btn btn--primary" onClick={() => setOpen(false)}>
            {label("nav.volunteer")}
          </Link>
        </div>
      </div>
    </>
  );
}
