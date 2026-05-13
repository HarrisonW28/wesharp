import type { Metadata } from "next";
import Link from "next/link";

import { MarketingArticle } from "@/components/marketing/MarketingArticle";
import {
  PortalOverviewMarketingPreview,
  PortalSubscriptionMarketingPreview,
} from "@/components/marketing/MarketingPortalPreviews";
import { PortalFeaturesBand } from "@/components/marketing/PortalFeaturesBand";

export const metadata: Metadata = {
  title: "Reporting & dashboards",
  description:
    "Cross-site dashboards, subscription allowance reporting, and finance-friendly invoice lists — all in one signed-in WeSharp customer portal.",
  openGraph: {
    title: "WeSharp — Reporting & dashboards for business accounts",
    description:
      "A single signed-in overview for your sites: what is due next, what is in the workshop, and what finance needs.",
    type: "website",
  },
};

export default function TradeReportingPage() {
  return (
    <MarketingArticle
      eyebrow="Portal features"
      title="Reporting & dashboards"
      lead="One signed-in dashboard rolls up every site — next collection, live orders, knives in the workshop, and invoices waiting on finance — so ops, head office, and finance read the same picture."
    >
      <PortalFeaturesBand variant="compact" currentKey="reporting" />

      <div className="space-y-10">
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">The overview dashboard</h2>
          <p>
            The signed-in{" "}
            <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
              customer portal
            </Link>{" "}
            opens with a snapshot built for busy kitchens: your next scheduled collection, orders still in progress, and
            invoices that need attention. Quick links jump straight into the full lists.
          </p>
          <PortalOverviewMarketingPreview />
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Cross-site operational visibility</h2>
          <p>
            Where the deep-dive pages above show one feature at a time, the dashboard is where it all comes together —
            useful for head office, area managers, and rotation chefs who need a quick state-of-the-group.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="text-foreground">Bookings rollup</span> — every confirmed visit across sites with dates
              and time windows, so a single screen shows who is being collected next.
            </li>
            <li>
              <span className="text-foreground">Live orders</span> — workshop status across the group, instead of
              chasing one site at a time.
            </li>
            <li>
              <span className="text-foreground">Knives at a glance</span> — totals tracked vs in the workshop right now,
              filterable by site.
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">Subscription &amp; allowance reporting</h2>
          <p>
            On a rolling programme,{" "}
            <Link href="/account/subscription" className="font-medium text-foreground underline underline-offset-4">
              your plan
            </Link>{" "}
            tile summarises included visits and knife allowance for the current billing period — so ops and finance see
            the same usage story before overage is invoiced. Pay-as-you-go kitchens get the same portal for bookings and
            invoices; allowance tiles only appear when they apply.
          </p>
          <PortalSubscriptionMarketingPreview />
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Finance-friendly lists</h2>
          <p>
            Invoice rows with clear statuses make it simple to match payments and chase anything outstanding. Combined
            with subscription usage on{" "}
            <Link href="/account/subscription" className="font-medium text-foreground underline underline-offset-4">
              your plan
            </Link>
            , finance gets allowance and overage context without a separate reporting tool.
          </p>
          <p className="text-sm text-muted-foreground">
            Administrative analytics inside our internal ops console are separate from this portal; what your team sees
            is scoped to your organisation and the users you invite.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Multi-site &amp; consolidated billing</h2>
          <p>
            Named locations and consolidated billing are part of how we set up{" "}
            <Link href="/trade-accounts" className="font-medium text-foreground underline underline-offset-4">
              trade accounts
            </Link>
            . During onboarding we agree who gets portal access and how invoices are addressed — then everyone works
            from the same dashboards.
          </p>
        </section>
      </div>
    </MarketingArticle>
  );
}
