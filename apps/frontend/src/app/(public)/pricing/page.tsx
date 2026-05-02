import Link from "next/link";

import { MarketingArticle } from "@/components/marketing/MarketingArticle";
import { PublicSubscriptionPlansPanel } from "@/components/marketing/PublicSubscriptionPlansPanel";
import { PRICING } from "@/config/pricing";
import { formatGBP } from "@/lib/format/money";
import { fetchPublicSiteData } from "@/lib/site-content/fetch-site-content";

export const revalidate = 60;

export default async function PricingPage() {
  const { content: site, publicSubscriptionPlans } = await fetchPublicSiteData();
  const p = site.pricing_page;
  const paygFromMinor = Math.min(...PRICING.tiers.map((t) => t.unitAmountMinor));

  return (
    <MarketingArticle title={p.title} lead={p.lead}>
      <div className="rounded-2xl border bg-muted/40 p-6 text-foreground">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="text-sm font-semibold">Pay-as-you-go (guide)</div>
            <div className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">From {formatGBP(paygFromMinor)}</div>
            <p className="mt-2 text-xs text-muted-foreground">Per knife on a typical ad-hoc collection — confirmed on quote.</p>
            <ul className="mt-4 space-y-1.5 border-t border-border/60 pt-4 text-xs text-muted-foreground">
              {PRICING.tiers.map((t) => (
                <li key={t.id}>
                  <span className="text-foreground">{t.label}</span> — {formatGBP(t.unitAmountMinor)} per knife
                  (guide)
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold">Regular programme (guide)</div>
            <PublicSubscriptionPlansPanel
              plans={publicSubscriptionPlans}
              fallbackMonthlyMinor={PRICING.subscriptionMonthlyMinor}
              footer="Example figures for scheduled visits — we tailor pricing when we understand your kitchen."
            />
          </div>
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
