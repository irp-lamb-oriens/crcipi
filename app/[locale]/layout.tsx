import { notFound } from "next/navigation";
import { locales, getContent, isLocale } from "@/content";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import HtmlLangSetter from "@/components/HtmlLangSetter";
import type { Locale } from "@/content/types";

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const content = getContent(locale);

  return (
    <>
      <HtmlLangSetter lang={content.htmlLang} />
      <SiteHeader locale={locale as Locale} content={content} />
      <main id="main">{children}</main>
      <SiteFooter locale={locale as Locale} content={content} />
    </>
  );
}