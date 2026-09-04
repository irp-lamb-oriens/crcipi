import type { Locale } from "@/content/types";

// Client-safe provider taxonomy. Shared by the server data layer and the
// client directory components so both sides agree on categories and labels.

export const PROVIDER_CATEGORIES = [
  "law",
  "immigration",
  "real-estate",
  "banking",
  "investments",
  "accounting",
  "tax",
  "insurance",
  "relocation",
  "healthcare",
  "tourism",
  "marketing",
  "communications",
  "other",
] as const;

export type ProviderCategory = (typeof PROVIDER_CATEGORIES)[number];

export const PROVIDER_CATEGORY_LABELS: Record<
  ProviderCategory,
  Record<Locale, string>
> = {
  law: { en: "Law", es: "Abogacía" },
  immigration: { en: "Immigration", es: "Migración" },
  "real-estate": { en: "Real Estate", es: "Bienes Raíces" },
  banking: { en: "Banking", es: "Banca" },
  investments: { en: "Investments", es: "Inversiones" },
  accounting: { en: "Accounting", es: "Contabilidad" },
  tax: { en: "Tax", es: "Impuestos" },
  insurance: { en: "Insurance", es: "Seguros" },
  relocation: { en: "Relocation", es: "Relocalización" },
  healthcare: { en: "Healthcare", es: "Salud" },
  tourism: { en: "Tourism", es: "Turismo" },
  marketing: { en: "Marketing", es: "Marketing" },
  communications: { en: "Communications", es: "Comunicaciones" },
  other: { en: "Other", es: "Otro" },
};