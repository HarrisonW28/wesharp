import { MarketingArticle } from "@/components/marketing/MarketingArticle";
import { SERVICE_AREAS } from "@/config/service-areas";

export default function ServiceAreasPage() {
  return (
    <MarketingArticle
      title="Areas we cover"
      lead="We currently collect and deliver across Greater Manchester and Liverpool. Tell us your postcode when you book — we’ll confirm we can reach you."
    >
      <div className="flex flex-wrap gap-2">
        {SERVICE_AREAS.map((area) => (
          <span key={area.id} className="rounded-full border bg-card px-3 py-1.5 text-sm text-foreground">
            {area.label}
          </span>
        ))}
      </div>
      <p className="pt-4">
        Not sure you’re covered? Tell us where you operate on the enquiry form — we qualify against active service areas before confirming a pickup.
      </p>
    </MarketingArticle>
  );
}
