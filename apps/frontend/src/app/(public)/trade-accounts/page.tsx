import type { Metadata } from "next";
import Link from "next/link";

import { MarketingArticle } from "@/components/marketing/MarketingArticle";
import { PortalOverviewMarketingPreview } from "@/components/marketing/MarketingPortalPreviews";
import { PortalFeaturesBand } from "@/components/marketing/PortalFeaturesBand";

export const metadata: Metadata = {
  title: "Trade & business kitchens",
  description:
    "Multi-site knife sharpening with predictable routes, consolidated billing, and a shared customer portal for bookings, orders, knives, invoices, and reporting.",
  openGraph: {
    title: "WeSharp — For business & trade kitchens",
    description:
      "Collections, tracking, and invoices built for restaurants, groups, and suppliers — without drowning you in jargon.",
    type: "website",
  },
};

export default function TradeAccountsPage() {
  return (
    <MarketingArticle
      eyebrow="Restaurants, groups & suppliers"
      title="For business & trade kitchens"
      lead="Whether you run one busy site or many, we make collections, tracking, and billing predictable — without drowning you in jargon."
    >
      <PortalFeaturesBand variant="prominent" />

      <ul className="list-disc space-y-2 pl-5">
        <li>Named contacts per site and invoices that match how your finance team already works.</li>
        <li>Regular route slots so brigades know when we&apos;re on the way — not last-minute guesswork.</li>
        <li>
          Your team uses the same{" "}
          <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
            customer portal
          </Link>{" "}
          to book, follow orders, see knives, and download invoices — everything in one place.
        </li>
      </ul>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Overview in one screen</h2>
        <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
          After onboarding, everyone you invite starts from the same dashboard — next collection, live orders, and
          invoices — before opening any of the feature pages above.
        </p>
        <PortalOverviewMarketingPreview />
      </section>

      <p>
        Tell us about your sites on the booking form — we&apos;ll agree terms, payment rhythm, and who gets logins before
        anything goes live.
      </p>
      <p className="text-sm text-muted-foreground">
        Already on a programme? Explore{" "}
        <Link href="/subscriptions" className="font-medium text-foreground underline underline-offset-4">
          how subscriptions work
        </Link>
        . Want more detail on any area? Use the{" "}
        <Link href="#portal-features" className="font-medium text-foreground underline underline-offset-4">
          portal features
        </Link>{" "}
        at the top of this page.
      </p>
    </MarketingArticle>
  );
}
