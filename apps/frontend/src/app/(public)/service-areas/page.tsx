import { Suspense } from "react";

import { MarketingArticle } from "@/components/marketing/MarketingArticle";
import { ServiceAreaCheckerSection } from "@/components/marketing/ServiceAreaCheckerSection";
import { SERVICE_AREAS } from "@/config/service-areas";
import { fetchPublicSiteContent } from "@/lib/site-content/fetch-site-content";

export const revalidate = 60;

export default async function ServiceAreasPage() {
  const site = await fetchPublicSiteContent();
  const s = site.service_areas;

  return (
    <MarketingArticle title={s.title} lead={s.lead}>
      <Suspense
        fallback={<div className="mb-8 h-56 animate-pulse rounded-xl border bg-muted/30" aria-busy="true" aria-label="Loading postcode checker" />}
      >
        <ServiceAreaCheckerSection className="mb-8" />
      </Suspense>
      <div className="flex flex-wrap gap-2">
        {SERVICE_AREAS.map((area) => (
          <span key={area.id} className="rounded-full border bg-card px-3 py-1.5 text-sm text-foreground">
            {area.label}
          </span>
        ))}
      </div>
      <p className="pt-4">{s.footnote}</p>
    </MarketingArticle>
  );
}
