import type { Metadata } from "next";
import Link from "next/link";

import { MarketingArticle } from "@/components/marketing/MarketingArticle";
import { PublicSubscriptionPlansCatalog } from "@/components/marketing/PublicSubscriptionPlansCatalog";
import { fetchPublicSiteContent } from "@/lib/site-content/fetch-site-content";

export const metadata: Metadata = {
  title: "Subscriptions & programmes",
  description:
    "Rolling knife-care programmes with included visits and allowances — prices in GBP from our live catalogue. Overage explained before you commit.",
  openGraph: {
    title: "WeSharp — Subscription programmes",
    description: "Care-style programmes for busy kitchens. Live plan cards from the WeSharp API.",
    type: "website",
  },
};

export const revalidate = 60;

export default async function SubscriptionsPage() {
  const site = await fetchPublicSiteContent();
  const sp = site.subscriptions_page;

  return (
    <MarketingArticle eyebrow="Care plans for busy kitchens" title={sp.title} lead={sp.lead}>
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">What you get</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Scheduled collections aligned with your openings — fewer surprises on the diary.</li>
          <li>
            A clear allowance for collections and knives each billing period. If you exceed it, we surface{" "}
            <strong className="font-medium text-foreground">overage</strong> in plain language — in the calculator, on your
            quote, and in the portal — before you commit to extra work.
          </li>
          <li>
            Your own{" "}
            <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
              customer portal
            </Link>{" "}
            for usage, invoices, and summaries.
          </li>
        </ul>
      </section>
      <section className="space-y-3 rounded-xl border bg-muted/25 p-4 md:p-5">
        <h2 className="text-base font-semibold text-foreground">Try pay-as-you-go first</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Programmes suit steady volume; a one-off collection is often the easiest way to see how we work. The{" "}
          <Link href="/pricing" className="font-medium text-foreground underline underline-offset-4">
            pricing calculator
          </Link>{" "}
          handles both modes in <span className="font-medium text-foreground">GBP (£)</span> using the same backend logic as
          your final quote.
        </p>
      </section>
      <section className="space-y-3 rounded-xl border bg-card p-5 text-foreground">
        <h2 className="text-base font-semibold">Programme pricing (guide)</h2>
        <p className="text-sm text-muted-foreground">
          Every kitchen is different. Cards below pull from our live <strong className="font-medium text-foreground">public subscription-plans</strong> endpoint — indicative until we confirm a written quote for your volumes and cadence.
        </p>
        <PublicSubscriptionPlansCatalog />
        <p className="text-sm text-muted-foreground">
          <Link href="/trade-accounts" className="font-medium text-foreground underline underline-offset-4">
            Trade accounts
          </Link>{" "}
          cover multi-site and consolidated billing. See{" "}
          <Link href="/trade-accounts/reporting" className="font-medium text-foreground underline underline-offset-4">
            reporting &amp; dashboards
          </Link>{" "}
          for how teams use the portal day to day.
        </p>
      </section>
      <p>
        Not sure yet? Start with a{" "}
        <Link href="/book" className="font-medium text-foreground underline underline-offset-4">
          one-off collection
        </Link>{" "}
        — we can move you onto a programme once you&apos;ve seen how we work.
      </p>
    </MarketingArticle>
  );
}
