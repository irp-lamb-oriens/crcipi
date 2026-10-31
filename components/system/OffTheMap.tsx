"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Seal from "@/components/brand/Seal";
import { pagePath, type PageKey } from "@/lib/i18n";
import styles from "./OffTheMap.module.scss";

const COPY = {
  en: {
    kicker: "Error 404",
    title: "Off the map.",
    body: "This page doesn't exist, moved, or never made it through customs. Here is where we are, and where you might want to go.",
    asked: "You asked for",
    here: "We are at",
    go: "Try one of these",
    pages: { home: "Home", directory: "Member directory", jobs: "Jobs", blog: "Insights", join: "Join CR-CIPI" },
    retry: "Try again",
    errorKicker: "Something went wrong",
    errorTitle: "Off course.",
    errorBody: "We couldn't load this page just now. It's on us, not you. Try again, or head somewhere else.",
  },
  es: {
    kicker: "Error 404",
    title: "Fuera del mapa.",
    body: "Esta página no existe, se movió o nunca pasó migración. Aquí estamos nosotros, y aquí podría querer ir.",
    asked: "Usted buscó",
    here: "Estamos en",
    go: "Pruebe uno de estos",
    pages: { home: "Inicio", directory: "Directorio de miembros", jobs: "Empleos", blog: "Artículos", join: "Únase a CR-CIPI" },
    retry: "Intentar de nuevo",
    errorKicker: "Algo salió mal",
    errorTitle: "Fuera de rumbo.",
    errorBody: "No pudimos cargar esta página. Es nuestra culpa, no suya. Intente de nuevo o vaya a otra sección.",
  },
} as const;

const ROUTES: PageKey[] = ["home", "directory", "jobs", "blog", "join"];

// One view for both "not found" and runtime errors: same coordinates, same
// way out. Language follows the URL the visitor tried.
export default function OffTheMap({ variant = "404", onRetry }: { variant?: "404" | "error"; onRetry?: () => void }) {
  const pathname = usePathname() ?? "/";
  const locale = pathname.startsWith("/es") ? "es" : "en";
  const t = COPY[locale];
  const isError = variant === "error";

  return (
    <section className={styles.page} lang={locale} aria-labelledby="otm-title">
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className="eyebrow">{isError ? t.errorKicker : t.kicker}</p>
          <h1 id="otm-title" className={styles.title}>
            <span className="lineMask">
              <span>{isError ? t.errorTitle : t.title}</span>
            </span>
          </h1>
          <p className={styles.body}>{isError ? t.errorBody : t.body}</p>
          <dl className={styles.coords}>
            {!isError ? (
              <div>
                <dt>{t.asked}</dt>
                <dd>{pathname}</dd>
              </div>
            ) : null}
            <div>
              <dt>{t.here}</dt>
              <dd>9.9281° N · 84.0907° W</dd>
            </div>
          </dl>
          {onRetry ? (
            <button type="button" className="btn btn--primary" onClick={onRetry}>
              {t.retry}
            </button>
          ) : null}
        </div>

        <nav className={styles.routes} aria-label={t.go}>
          <p className={styles.routesTitle}>{t.go}</p>
          <ul>
            {ROUTES.map((key, i) => (
              <li key={key}>
                <Link href={pagePath(key, locale)}>
                  <span className={styles.n}>{String(i + 1).padStart(2, "0")}</span>
                  {t.pages[key as keyof typeof t.pages]}
                  <span aria-hidden="true" className={styles.arrow}>
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <Seal id="otm" size="lg" spin={false} className={styles.compass} label="" />
      </div>
    </section>
  );
}
