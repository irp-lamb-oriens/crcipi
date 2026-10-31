import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/content";
import { getLiveContent } from "@/lib/contentStore";
import { buildPageMetadata } from "@/lib/metadata";
import LegalPage from "@/components/LegalPage";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const content = await getLiveContent(locale);
  return buildPageMetadata({
    path: locale === "en" ? "/en/privacy" : "/es/privacidad",
    alternatives: { en: "/en/privacy", es: "/es/privacidad" },
    title: content.privacy.meta.title,
    description: content.privacy.meta.description,
  });
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const content = await getLiveContent(locale);
  return <LegalPage content={content.privacy} prefix="privacy" />;
}
