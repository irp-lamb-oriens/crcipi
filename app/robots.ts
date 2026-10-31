import type { MetadataRoute } from "next";
import { site } from "@/content/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/api/media/"],
      // Private consoles and APIs have nothing to index.
      disallow: ["/admin", "/account", "/api/"],
    },
    sitemap: `${site.domain}/sitemap.xml`,
  };
}