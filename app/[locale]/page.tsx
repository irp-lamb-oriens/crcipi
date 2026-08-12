import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getContent, isLocale } from "@/content";
import { buildPageMetadata } from "@/lib/metadata";
import HeroSection from "@/components/HeroSection";
import StatsStrip from "@/components/StatsStrip";
import PurposeSection from "@/components/PurposeSection";
import WhyJoin from "@/components/WhyJoin";
import Initiatives from "@/components/Initiatives";
import SharedPurpose from "@/components/SharedPurpose";
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
      <StatsStrip items={content.home.stats.items} />
      <PurposeSection
        eyebrow={content.home.purpose.eyebrow}
        heading={content.home.purpose.heading}
        body={content.home.purpose.body}
        vision={content.home.purpose.vision}
      />
      <WhyJoin
        eyebrow={content.home.whyJoin.eyebrow}
        heading={content.home.whyJoin.heading}
        body={content.home.whyJoin.body}
      />
      <Initiatives
        eyebrow={content.home.initiatives.eyebrow}
        heading={content.home.initiatives.heading}
        exampleLabel={content.home.initiatives.exampleLabel}
        memberValueLabel={content.home.initiatives.memberValueLabel}
        items={content.home.initiatives.items}
      />
      <SharedPurpose
        locale={locale}
        eyebrow={content.home.sharedPurpose.eyebrow}
        heading={content.home.sharedPurpose.heading}
        body={content.home.sharedPurpose.body}
        cta={content.home.sharedPurpose.cta}
      />
    </>
  );
}