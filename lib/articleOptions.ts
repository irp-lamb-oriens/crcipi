import type { Locale } from "@/content/types";

// Client-safe vocabulary for member articles.

export const ARTICLE_STATUSES = ["draft", "in_review", "published", "rejected", "archived"] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export const ARTICLE_CATEGORIES = [
  "living",
  "investing",
  "real-estate",
  "legal-immigration",
  "tax-finance",
  "business",
  "health",
  "tourism",
  "other",
] as const;
export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

export const ARTICLE_CATEGORY_LABELS: Record<ArticleCategory, Record<Locale, string>> = {
  living: { en: "Living in Costa Rica", es: "Vivir en Costa Rica" },
  investing: { en: "Investing", es: "Inversión" },
  "real-estate": { en: "Real estate", es: "Bienes raíces" },
  "legal-immigration": { en: "Legal & immigration", es: "Legal y migración" },
  "tax-finance": { en: "Tax & finance", es: "Impuestos y finanzas" },
  business: { en: "Doing business", es: "Hacer negocios" },
  health: { en: "Health & retirement", es: "Salud y retiro" },
  tourism: { en: "Tourism", es: "Turismo" },
  other: { en: "Other", es: "Otros" },
};

export const ARTICLE_STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  published: "Published",
  rejected: "Changes needed",
  archived: "Archived",
};

export const ARTICLE_LIMITS = {
  title: 140,
  excerpt: 300,
  bodyMin: 600,
  bodyMax: 20000,
} as const;

export function readingMinutes(body: string): number {
  return Math.max(1, Math.round(body.trim().split(/\s+/).length / 220));
}
