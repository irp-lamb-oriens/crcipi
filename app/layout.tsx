import type { Metadata, Viewport } from "next";
import "@/styles/globals.scss";
import { site } from "@/content/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.domain),
  title: {
    default: "CR-CIPI | Costa Rican Chamber of International Private Investment",
    template: "%s",
  },
  description:
    "An independent private-sector initiative bringing together professionals and organizations to attract, facilitate and protect responsible international private investment in Costa Rica.",
  openGraph: {
    type: "website",
    siteName: site.name,
    title: "CR-CIPI",
    description:
      "An independent private-sector initiative to attract, facilitate and protect responsible international private investment in Costa Rica.",
    locale: "en_US",
    alternateLocale: "es_CR",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}