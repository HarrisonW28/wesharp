import type { Metadata } from "next";
import Link from "next/link";

import { MarketingArticle } from "@/components/marketing/MarketingArticle";
import { PublicPricingCalculator } from "@/components/marketing/PublicPricingCalculator";
import { PublicSubscriptionPlansCatalog } from "@/components/marketing/PublicSubscriptionPlansCatalog";
import { fetchPublicSiteData } from "@/lib/site-content/fetch-site-content";

export const metadata: Metadata = {
  title: "Pricing | WeSharp",
  description:
    "Live pricing estimate and subscription programmes. Written quote before you commit.",
  openGraph: {
    title: "WeSharp — Pricing guide",
    description: "Estimate knife sharpening costs with our live calculator. Programmes loaded from the server.",
    type: "website",
  },
};

export const revalidate = 60;

export default async function PricingPage() {
  const { content: site } = await fetchPublicSiteData();
  const p = site.pricing_page;

  return (
    <MarketingArticle title={p.title} lead={p.lead}>
      <section className="space-y-2 rounded-xl border bg-muted/20 p-4 md:p-5">
        <h2 className="text-base font-semibold text-foreground">One-off visit vs subscription</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Pay as you go</span> — priced per visit (and per knife where that
            rule applies). Best when you want to try the service or book occasionally.
          </li>
          <li>
            <span className="font-medium text-foreground">Subscription / programme</span> — a recurring bundle with included
            collections and a knife allowance. If you send more knives than the allowance, the calculator and your account
            explain <span className="font-medium text-foreground">overage</span> before anything is charged.
          </li>
        </ul>
        <p className="text-sm text-muted-foreground">
          Not sure? Use the calculator both ways, then{" "}
          <Link href="/subscriptions" className="font-medium text-foreground underline underline-offset-4">
            compare published programmes
          </Link>
          .
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <PublicPricingCalculator />
        <div className="rounded-2xl border bg-muted/40 p-6 text-foreground">
          <div className="text-sm font-semibold">Programmes on file</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Active plans marked “show on public site” in admin — your operation may list more bespoke options offline.
          </p>
          <PublicSubscriptionPlansCatalog
            footer="Figures load live from the catalogue — the calculator combines the same allowances and overage rules for your knife count."
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
