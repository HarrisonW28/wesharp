import type { Metadata } from "next";
import Link from "next/link";

import { MarketingArticle } from "@/components/marketing/MarketingArticle";
import {
  PortalOverviewMarketingPreview,
  PortalSubscriptionMarketingPreview,
} from "@/components/marketing/MarketingPortalPreviews";

export const metadata: Metadata = {
  title: "Reporting & dashboards",
  description:
    "How trade and multi-site kitchens see collections, orders, knives, invoices, and subscription usage in the WeSharp customer portal.",
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
      eyebrow="Trade & hospitality accounts"
      title="Reporting & dashboards in your portal"
      lead="Your team signs in to one place — no chasing spreadsheets or inbox threads to know what is happening across sites."
    >
      <div className="space-y-10">
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">Overview dashboard</h2>
          <p>
            The signed-in{" "}
            <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
              customer portal
            </Link>{" "}
            opens with a snapshot built for busy kitchens: your next scheduled collection, orders still in progress, and
            invoices that need attention. Quick links take you straight into bookings, orders, knives, or invoices when
            you need the full list.
          </p>
          <PortalOverviewMarketingPreview />
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Operational visibility</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="text-foreground">Bookings</span> — dates, time windows, and status so sites know when
              we&apos;re expected.
            </li>
            <li>
              <span className="text-foreground">Orders</span> — live status from collection through workshop and return,
              so front-of-house and finance share the same picture.
            </li>
            <li>
              <span className="text-foreground">Knives</span> — register-level detail for blades you track with us,
              helpful when auditing kit across venues.
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">Plans &amp; allowances</h2>
          <p>
            On a rolling programme,{" "}
            <Link href="/account/subscription" className="font-medium text-foreground underline underline-offset-4">
              your plan
            </Link>{" "}
            summarises included visits and knife allowance for the current period — so ops and finance see the same usage
            story. Pay-as-you-go kitchens get the same portal for bookings and invoices; allowance tiles only appear when
            they apply.
          </p>
          <PortalSubscriptionMarketingPreview />
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Finance-friendly exports</h2>
          <p>
            Invoices list with statuses makes it simple to match payments and chase anything outstanding. Together with
            subscription usage on{" "}
            <Link href="/account/subscription" className="font-medium text-foreground underline underline-offset-4">
              your plan
            </Link>{" "}
            (once you&apos;re logged in), finance gets allowance and overage context without a separate reporting tool.
          </p>
          <p className="text-sm text-muted-foreground">
            Administrative analytics inside our internal ops console are separate from this portal; what you see here is
            scoped to your organisation and the users you invite.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Multi-site accounts</h2>
          <p>
            Named locations and consolidated billing are part of how we set up{" "}
            <Link href="/trade-accounts" className="font-medium text-foreground underline underline-offset-4">
              trade accounts
            </Link>
            . During onboarding we agree who gets portal access and how invoices are addressed — then everyone works from
            the same dashboards.
          </p>
        </section>
      </div>
    </MarketingArticle>
  );
}
