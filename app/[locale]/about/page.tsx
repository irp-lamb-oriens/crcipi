import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getContent, isLocale } from "@/content";
import { buildPageMetadata } from "@/lib/metadata";
import PageHero from "@/components/PageHero";
import MissionBlock from "@/components/MissionBlock";
import InstitutionalPriorities from "@/components/InstitutionalPriorities";
import WhatWeAreNot from "@/components/WhatWeAreNot";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const content = getContent(locale);
  return buildPageMetadata({
    path: locale === "en" ? "/en/about" : "/es/quienes-somos",
    alternatives: { en: "/en/about", es: "/es/quienes-somos" },
    title: content.meta.title,
    description: content.meta.description,
  });
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const content = getContent(locale);

  return (
    <>
      <PageHero
        eyebrow={content.about.hero.eyebrow}
        heading={content.about.hero.heading}
        body={content.about.hero.body}
      />
      <MissionBlock
        eyebrow={content.about.mission.eyebrow}
        heading={content.about.mission.heading}
        body={content.about.mission.body}
      />
      <InstitutionalPriorities
        eyebrow={content.about.priorities.eyebrow}
        heading={content.about.priorities.heading}
        items={content.about.priorities.items}
      />
      <WhatWeAreNot
        eyebrow={content.about.not.eyebrow}
        heading={content.about.not.heading}
        items={content.about.not.items}
        positioning={content.about.not.positioning}
      />
    </>
  );
}