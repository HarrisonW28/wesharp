import { MarketingArticle } from "@/components/marketing/MarketingArticle";

export default function PricingPage() {
  return (
    <MarketingArticle
      title="Pricing"
      lead="Pricing is agreed per outlet based on cadence, volumes, and service mix — illustrative figures mirror the MVP marketing tile until a live catalogue API exists."
    >
      <div className="rounded-2xl border bg-muted/40 p-6 text-foreground">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="text-sm font-semibold">Pay-as-you-go · illustrative</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight">From £8.50</div>
            <p className="mt-2 text-xs text-muted-foreground">Per knife — typical collection tier from seeded pricing rule.</p>
          </div>
          <div>
            <div className="text-sm font-semibold">Subscriptions · illustrative</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight">£49</div>
            <p className="mt-2 text-xs text-muted-foreground">Monthly baseline bundle — customise in negotiations.</p>
          </div>
        </div>
      </div>
      <p>Trade-account programmes combine scheduled routes with consolidated invoicing — see Trade accounts.</p>
    </MarketingArticle>
  );
}
