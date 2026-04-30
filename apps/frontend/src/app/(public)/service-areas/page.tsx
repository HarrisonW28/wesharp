import { MarketingArticle } from "@/components/marketing/MarketingArticle";
import { SERVICE_AREAS } from "@/config/service-areas";

export default function ServiceAreasPage() {
  return (
    <MarketingArticle
      title="Service areas"
      lead="Regional coverage is seeded for demo geography — production rolls out postcode-driven routing on top of the same service-area backbone."
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
