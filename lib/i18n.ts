import type { Locale } from "@/content/types";

// Maps each page key to its path in each locale.
// Used by the language switcher to preserve the equivalent page.
const pagePaths: Record<
  "home" | "about" | "join" | "directory" | "jobs" | "blog" | "privacy" | "terms",
  Record<Locale, string>
> = {
  home: { en: "/en", es: "/es" },
  about: { en: "/en/about", es: "/es/quienes-somos" },
  join: { en: "/en/join", es: "/es/unete" },
  directory: { en: "/en/directory", es: "/es/directorio" },
  jobs: { en: "/en/jobs", es: "/es/empleos" },
  blog: { en: "/en/blog", es: "/es/blog" },
  privacy: { en: "/en/privacy", es: "/es/privacidad" },
  terms: { en: "/en/terms", es: "/es/terminos" },
};

export type PageKey = keyof typeof pagePaths;

// Pages with detail routes keep their trailing id/slug across locales
// (e.g. /en/jobs/abc123 -> /es/empleos/abc123).
const DETAIL_PAGES: PageKey[] = ["directory", "jobs", "blog"];

export function pagePath(key: PageKey, locale: Locale): string {
  return pagePaths[key][locale];
}

export function getPageKey(pathname: string): PageKey {
  const withoutLocale = pathname.replace(/^\/(en|es)(?=\/|$)/, "");
  const first = withoutLocale.split("/")[1] ?? "";
  for (const key of Object.keys(pagePaths) as PageKey[]) {
    if (key === "home") continue;
    const segments = [pagePaths[key].en, pagePaths[key].es].map((p) => p.split("/")[2]);
    // Also accept the internal (rewritten) English segment under /es.
    if (segments.includes(first) || first === key) return key;
  }
  return "home";
}

export function getLocalizedPath(pathname: string, targetLocale: Locale): string {
  const key = getPageKey(pathname);
  const base = pagePaths[key][targetLocale];
  if (!DETAIL_PAGES.includes(key)) return base;

  const segments = pathname.replace(/^\/(en|es)/, "").split("/").filter(Boolean);
  const rest = segments.slice(1).join("/");
  return rest ? `${base}/${rest}` : base;
}

export function getAlternateLocale(current: Locale): Locale {
  return current === "en" ? "es" : "en";
}
