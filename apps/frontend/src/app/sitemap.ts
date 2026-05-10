import type { MetadataRoute } from "next";

import { SERVICE_AREAS } from "@/config/service-areas";
import { publicSiteOrigin } from "@/lib/public-site-url";

type ChangeFreq = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

/** Primary marketing URLs — adjust if you add/remove public routes. */
const STATIC_PATHS: { path: string; changeFrequency: ChangeFreq; priority: number }[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/services", changeFrequency: "weekly", priority: 0.9 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.9 },
  { path: "/subscriptions", changeFrequency: "weekly", priority: 0.85 },
  { path: "/how-it-works", changeFrequency: "monthly", priority: 0.85 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.75 },
  { path: "/safety", changeFrequency: "monthly", priority: 0.7 },
  { path: "/service-areas", changeFrequency: "weekly", priority: 0.85 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.7 },
  { path: "/book", changeFrequency: "weekly", priority: 0.85 },
  { path: "/trade-accounts", changeFrequency: "monthly", priority: 0.6 },
  { path: "/trade-accounts/reporting", changeFrequency: "monthly", priority: 0.55 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = publicSiteOrigin();
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map(({ path, changeFrequency, priority }) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));

  const areaEntries: MetadataRoute.Sitemap = SERVICE_AREAS.map((a) => ({
    url: `${base}/service-areas/${a.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.75,
  }));

  return [...staticEntries, ...areaEntries];
}
