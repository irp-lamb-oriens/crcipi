import { notFound } from "next/navigation";
import { locales, isLocale } from "@/content";
import { getLiveContent } from "@/lib/contentStore";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import HtmlLangSetter from "@/components/HtmlLangSetter";
import CmsProvider from "@/components/cms/CmsProvider";
import AnnouncementBanner from "@/components/cms/AnnouncementBanner";
import AdminBar from "@/components/cms/AdminBar";
import type { Locale } from "@/content/types";

export const dynamic = "force-dynamic";

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
  const content = await getLiveContent(locale);

  return (
    <CmsProvider locale={locale} initialContent={content}>
      <HtmlLangSetter lang={content.htmlLang} />
      <AnnouncementBanner />
      <SiteHeader locale={locale as Locale} />
      <main id="main">{children}</main>
      <SiteFooter locale={locale as Locale} />
      <AdminBar />
    </CmsProvider>
  );
}