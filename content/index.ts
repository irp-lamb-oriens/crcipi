import type { Locale, PageContent } from "./types";
import { en } from "./en";
import { es } from "./es";

export const content: Record<Locale, PageContent> = { en, es };

export const locales: Locale[] = ["en", "es"];

export function getContent(locale: Locale): PageContent {
  return content[locale];
}

export function isLocale(value: string): value is Locale {
  return value === "en" || value === "es";
}