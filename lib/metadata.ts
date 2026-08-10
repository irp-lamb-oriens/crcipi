import type { Metadata } from "next";
import { site } from "@/content/site";

export interface PageMeta {
  path: string;
  alternatives: { en: string; es: string };
  title: string;
  description: string;
}

export function buildPageMetadata(meta: PageMeta): Metadata {
  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `${site.domain}${meta.path}`,
      languages: {
        en: `${site.domain}${meta.alternatives.en}`,
        es: `${site.domain}${meta.alternatives.es}`,
      },
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      locale: meta.path.startsWith("/es") ? "es_CR" : "en_US",
      alternateLocale: meta.path.startsWith("/es") ? "en_US" : "es_CR",
      type: "website",
      siteName: site.name,
    },
  };
}