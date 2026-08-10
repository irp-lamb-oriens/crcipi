import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getContent, isLocale } from "@/content";
import { buildPageMetadata } from "@/lib/metadata";
import HeroSection from "@/components/HeroSection";
import PriorityCards from "@/components/PriorityCards";
import FoundingCallout from "@/components/FoundingCallout";
import type { Locale } from "@/content/types";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const content = getContent(locale);
  return buildPageMetadata({
    path: locale === "en" ? "/en" : "/es",
    alternatives: { en: "/en", es: "/es" },
    title: content.meta.title,
    description: content.meta.description,
  });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const content = getContent(locale);

  return (
    <>
      <HeroSection
        locale={locale}
        eyebrow={content.home.hero.eyebrow}
        headline={content.home.hero.headline}
        body={content.home.hero.body}
        primaryCta={content.home.hero.primaryCta}
        secondaryCta={content.home.hero.secondaryCta}
      />
      <PriorityCards
        eyebrow={content.home.priorities.eyebrow}
        heading={content.home.priorities.heading}
        cards={content.home.priorities.cards}
      />
      <FoundingCallout
        locale={locale}
        eyebrow={content.home.founding.eyebrow}
        heading={content.home.founding.heading}
        body={content.home.founding.body}
        cta={content.home.founding.cta}
      />
    </>
  );
}