import type { MetadataRoute } from "next";
import { site } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: "/en", priority: 1.0 },
    { path: "/es", priority: 1.0 },
    { path: "/en/about", priority: 0.8 },
    { path: "/es/quienes-somos", priority: 0.8 },
    { path: "/en/join", priority: 0.9 },
    { path: "/es/unete", priority: 0.9 },
  ];

  return routes.map((route) => ({
    url: `${site.domain}${route.path}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: route.priority,
  }));
}