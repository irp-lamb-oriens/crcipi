import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/content";
import { getLiveContent } from "@/lib/contentStore";
import { buildPageMetadata } from "@/lib/metadata";
import PageHero from "@/components/PageHero";
import CommitteeGrid from "@/components/CommitteeGrid";
import ParticipationCards from "@/components/ParticipationCards";
import FoundingGoals from "@/components/FoundingGoals";
import InterestForm from "@/components/InterestForm";
import styles from "./page.module.scss";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const content = await getLiveContent(locale);
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
  const content = await getLiveContent(locale);

  return (
    <>
      <PageHero
        pathPrefix="join.hero"
        eyebrow={content.join.hero.eyebrow}
        heading={content.join.hero.heading}
        body={[content.join.hero.body]}
        aside={
          <a href="#form" className="btn btn--primary">
            {content.nav.volunteer}
            <span className="btn__arrow" aria-hidden="true">↓</span>
          </a>
        }
      />
      <ParticipationCards
        eyebrow={content.join.participation.eyebrow}
        heading={content.join.participation.heading}
        options={content.join.participation.options}
      />
      <CommitteeGrid
        eyebrow={content.join.committees.eyebrow}
        heading={content.join.committees.heading}
        items={content.join.committees.items}
      />
      {/* Sticky split: the pitch and the proof hold still while the form scrolls. */}
      <section id="form" className={styles.formSection} aria-labelledby="form-heading">
        <div className={styles.formInner}>
          <div className={styles.pitch}>
            <p className="eyebrow">{locale === "en" ? "Application" : "Solicitud"}</p>
            <h2 id="form-heading" className={styles.formHeading}>
              {content.join.form.heading}
            </h2>
            <p className={styles.formIntro}>{content.join.form.intro}</p>
            <FoundingGoals
              eyebrow={content.join.goals.eyebrow}
              heading={content.join.goals.heading}
              items={content.join.goals.items}
            />
          </div>
          <div className={styles.formCard}>
            <InterestForm form={content.join.form} locale={locale} page={locale === "en" ? "/en/join" : "/es/unete"} />
          </div>
        </div>
      </section>
    </>
  );
}