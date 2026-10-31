import type { MetadataRoute } from "next";
import { site } from "@/content/site";
import { listPublished } from "@/lib/articles";
import { listLiveJobs } from "@/lib/jobs";
import { listProviders } from "@/lib/providers";

// Rendered per request so new jobs and articles are discoverable right away.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = [
    { path: "/en", priority: 1.0 },
    { path: "/es", priority: 1.0 },
    { path: "/en/about", priority: 0.8 },
    { path: "/es/quienes-somos", priority: 0.8 },
    { path: "/en/join", priority: 0.9 },
    { path: "/es/unete", priority: 0.9 },
    { path: "/en/directory", priority: 0.7 },
    { path: "/es/directorio", priority: 0.7 },
    { path: "/en/jobs", priority: 0.8 },
    { path: "/es/empleos", priority: 0.8 },
    { path: "/en/blog", priority: 0.8 },
    { path: "/es/blog", priority: 0.8 },
    { path: "/en/privacy", priority: 0.2 },
    { path: "/es/privacidad", priority: 0.2 },
    { path: "/en/terms", priority: 0.2 },
    { path: "/es/terminos", priority: 0.2 },
  ];

  const pages: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${site.domain}${route.path}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: route.priority,
  }));

  // Dynamic entries are best effort: a data outage must not break the sitemap.
  const [jobs, articles, providers] = await Promise.all([
    listLiveJobs().catch(() => []),
    listPublished().catch(() => []),
    listProviders({ approvedOnly: true }).catch(() => []),
  ]);

  for (const provider of providers) {
    for (const base of ["/en/directory", "/es/directorio"]) {
      pages.push({
        url: `${site.domain}${base}/${provider.id}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: provider.verified ? 0.7 : 0.5,
      });
    }
  }

  for (const job of jobs) {
    for (const base of ["/en/jobs", "/es/empleos"]) {
      pages.push({
        url: `${site.domain}${base}/${job.id}`,
        lastModified: new Date(job.updatedAt),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }
  for (const article of articles) {
    pages.push({
      url: `${site.domain}/${article.language}/blog/${article.slug}`,
      lastModified: new Date(article.updatedAt),
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  return pages;
}