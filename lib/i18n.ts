import type { Locale } from "@/content/types";

// Maps each page key to its path in each locale.
// Used by the language switcher to preserve the equivalent page.
const pagePaths: Record<
  "home" | "about" | "join" | "directory",
  Record<Locale, string>
> = {
  home: { en: "/en", es: "/es" },
  about: { en: "/en/about", es: "/es/quienes-somos" },
  join: { en: "/en/join", es: "/es/unete" },
  directory: { en: "/en/directory", es: "/es/directorio" },
};

export type PageKey = keyof typeof pagePaths;

export function getPageKey(pathname: string): PageKey {
  if (pathname.includes("/about") || pathname.includes("/quienes-somos")) {
    return "about";
  }
  if (pathname.includes("/join") || pathname.includes("/unete")) {
    return "join";
  }
  if (pathname.includes("/directory") || pathname.includes("/directorio")) {
    return "directory";
  }
  return "home";
}

export function getLocalizedPath(pathname: string, targetLocale: Locale): string {
  const key = getPageKey(pathname);
  const base = pagePaths[key][targetLocale];
  if (key !== "directory") return base;

  // Directory detail pages preserve the trailing provider id across locales
  // (e.g. /en/directory/abc123 -> /es/directorio/abc123).
  const withoutLocale = pathname.replace(/^\/(en|es)/, "");
  const segment = withoutLocale.includes("/directorio") ? "/directorio" : "/directory";
  const rest = withoutLocale.slice(segment.length);
  return base + (rest.startsWith("/") ? rest : "");
}

export function getAlternateLocale(current: Locale): Locale {
  return current === "en" ? "es" : "en";
}