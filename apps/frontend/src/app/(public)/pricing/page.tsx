import Link from "next/link";

import { MarketingArticle } from "@/components/marketing/MarketingArticle";
import { PublicPricingCalculator } from "@/components/marketing/PublicPricingCalculator";
import { PublicSubscriptionPlansCatalog } from "@/components/marketing/PublicSubscriptionPlansCatalog";
import { fetchPublicSiteData } from "@/lib/site-content/fetch-site-content";

export const revalidate = 60;

export default async function PricingPage() {
  const { content: site } = await fetchPublicSiteData();
  const p = site.pricing_page;

  return (
    <MarketingArticle title={p.title} lead={p.lead}>
      <div className="grid gap-6 lg:grid-cols-2">
        <PublicPricingCalculator />
        <div className="rounded-2xl border bg-muted/40 p-6 text-foreground">
          <div className="text-sm font-semibold">Programmes on file</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Active plans marked “show on public site” in admin — your operation may list more bespoke options.
          </p>
          <PublicSubscriptionPlansCatalog
            footer="Figures are from the live catalogue — the calculator above combines allowances and overage for your knife count."
          />
        </div>
      </div>
      <p>
        Regular programmes bundle visits and allowances — see{" "}
        <Link href="/subscriptions" className="font-medium underline underline-offset-4">
          subscriptions &amp; programmes
        </Link>
        . Business kitchens often pair that with{" "}
        <Link href="/trade-accounts" className="font-medium underline underline-offset-4">
          a trade account
        </Link>{" "}
        for multi-site invoicing.
      </p>
    </MarketingArticle>
  );
}
