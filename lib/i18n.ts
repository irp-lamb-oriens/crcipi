import type { Locale } from "@/content/types";

// Maps each page key to its path in each locale.
// Used by the language switcher to preserve the equivalent page.
const pagePaths: Record<"home" | "about" | "join", Record<Locale, string>> = {
  home: { en: "/en", es: "/es" },
  about: { en: "/en/about", es: "/es/quienes-somos" },
  join: { en: "/en/join", es: "/es/unete" },
};

export type PageKey = keyof typeof pagePaths;

export function getPageKey(pathname: string): PageKey {
  if (pathname.includes("/about") || pathname.includes("/quienes-somos")) {
    return "about";
  }
  if (pathname.includes("/join") || pathname.includes("/unete")) {
    return "join";
  }
  return "home";
}

export function getLocalizedPath(pathname: string, targetLocale: Locale): string {
  const key = getPageKey(pathname);
  return pagePaths[key][targetLocale];
}

export function getAlternateLocale(current: Locale): Locale {
  return current === "en" ? "es" : "en";
}