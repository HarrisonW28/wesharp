import type { MetadataRoute } from "next";

import { publicSiteOrigin } from "@/lib/public-site-url";

export default function robots(): MetadataRoute.Robots {
  const origin = publicSiteOrigin();
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${origin}/sitemap.xml`,
  };
}
