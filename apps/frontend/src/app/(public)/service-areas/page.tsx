import { MarketingArticle } from "@/components/marketing/MarketingArticle";
import { SERVICE_AREAS } from "@/config/service-areas";

export default function ServiceAreasPage() {
  return (
    <MarketingArticle
      title="Areas we cover"
      lead="We collect and deliver across Greater Manchester and Liverpool. Add your postcode when you book — we only confirm if you’re in range."
    >
      <div className="flex flex-wrap gap-2">
        {SERVICE_AREAS.map((area) => (
          <span key={area.id} className="rounded-full border bg-card px-3 py-1.5 text-sm text-foreground">
            {area.label}
          </span>
        ))}
      </div>
      <p className="pt-4">
        Not sure you’re covered? Put your address on the enquiry form — we’ll tell you straight away if we can reach you.
      </p>
    </MarketingArticle>
  );
}
