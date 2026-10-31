import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/content";
import { getLiveContent } from "@/lib/contentStore";
import { buildPageMetadata } from "@/lib/metadata";
import { listProviders, averageRating } from "@/lib/providers";
import { recordEvent } from "@/lib/stats";
import PageHero from "@/components/PageHero";
import DirectoryClient, {
  type DirectoryProvider,
} from "@/components/DirectoryClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const content = await getLiveContent(locale);
  return buildPageMetadata({
    path: locale === "en" ? "/en/directory" : "/es/directorio",
    alternatives: { en: "/en/directory", es: "/es/directorio" },
    title: content.directory.meta.title,
    description: content.directory.meta.description,
  });
}

export default async function DirectoryPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const content = await getLiveContent(locale);
  const providers = await listProviders({ approvedOnly: true });
  recordEvent("directory_view");

  // Featured, then verified, then by last trust score; otherwise the store's order.
  const ordered = [...providers].sort(
    (a, b) =>
      Number(b.featured) - Number(a.featured) ||
      Number(b.verified) - Number(a.verified) ||
      (b.trustScore ?? 0) - (a.trustScore ?? 0)
  );
  const items: DirectoryProvider[] = ordered.map((provider) => ({
    id: provider.id,
    name: provider.name,
    category: provider.category,
    description: locale === "en" ? provider.descriptionEn : provider.descriptionEs,
    location: provider.location ?? null,
    logoUrl: provider.logoUrl ?? null,
    featured: provider.featured,
    verified: provider.verified,
    website: provider.website ?? null,
    email: provider.email ?? null,
    phone: provider.phone ?? null,
    rating: averageRating(provider),
    reviews: provider.ratingsCount,
  }));

  return (
    <>
      <PageHero
        pathPrefix="directory.hero"
        eyebrow={content.directory.hero.eyebrow}
        heading={content.directory.hero.heading}
        body={[content.directory.hero.body]}
      />
      <DirectoryClient
        locale={locale}
        providers={items}
        copy={content.directory}
      />
    </>
  );
}