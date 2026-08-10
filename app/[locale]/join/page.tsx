import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getContent, isLocale } from "@/content";
import { buildPageMetadata } from "@/lib/metadata";
import PageHero from "@/components/PageHero";
import CommitteeGrid from "@/components/CommitteeGrid";
import ParticipationCards from "@/components/ParticipationCards";
import FoundingGoals from "@/components/FoundingGoals";
import InterestForm from "@/components/InterestForm";
import styles from "./page.module.scss";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const content = getContent(locale);
  return buildPageMetadata({
    path: locale === "en" ? "/en/join" : "/es/unete",
    alternatives: { en: "/en/join", es: "/es/unete" },
    title: content.meta.title,
    description: content.meta.description,
  });
}

export default async function JoinPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const content = getContent(locale);

  return (
    <>
      <PageHero
        eyebrow={content.join.hero.eyebrow}
        heading={content.join.hero.heading}
        body={[content.join.hero.body]}
      />
      <CommitteeGrid
        eyebrow={content.join.committees.eyebrow}
        heading={content.join.committees.heading}
        items={content.join.committees.items}
      />
      <ParticipationCards
        eyebrow={content.join.participation.eyebrow}
        heading={content.join.participation.heading}
        options={content.join.participation.options}
      />
      <FoundingGoals
        eyebrow={content.join.goals.eyebrow}
        heading={content.join.goals.heading}
        items={content.join.goals.items}
      />
      <section id="form" className={styles.formSection} aria-labelledby="form-heading">
        <div className={styles.formInner}>
          <h2 id="form-heading" className={styles.formHeading}>
            {content.join.form.heading}
          </h2>
          <p className={styles.formIntro}>{content.join.form.intro}</p>
          <InterestForm form={content.join.form} locale={locale} page={locale === "en" ? "/en/join" : "/es/unete"} />
        </div>
      </section>
    </>
  );
}