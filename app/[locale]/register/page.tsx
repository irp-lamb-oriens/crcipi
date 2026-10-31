import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/content";
import { buildPageMetadata } from "@/lib/metadata";
import Onboarding from "@/components/Onboarding";
import styles from "./page.module.scss";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    ...buildPageMetadata({
      path: locale === "en" ? "/en/register" : "/es/registro",
      alternatives: { en: "/en/register", es: "/es/registro" },
      title: locale === "en" ? "Register your company | CR-CIPI" : "Registre su empresa | CR-CIPI",
      description:
        locale === "en"
          ? "List your company in the CR-CIPI member directory and receive consultation requests from international investors."
          : "Inscriba su empresa en el directorio de miembros de CR-CIPI y reciba solicitudes de inversionistas internacionales.",
    }),
    robots: { index: false },
  };
}

export default async function RegisterPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <section className={styles.page}>
      <Onboarding locale={locale} />
    </section>
  );
}
