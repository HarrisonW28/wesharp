import type { Metadata } from "next";
import Link from "next/link";

import { MarketingArticle } from "@/components/marketing/MarketingArticle";
import {
  PortalCollectionsMarketingPreview,
} from "@/components/marketing/MarketingPortalPreviews";

export const metadata: Metadata = {
  title: "Bookings & collections",
  description:
    "Predictable route slots, per-site time windows, and self-service amendments — manage every WeSharp collection from one signed-in portal.",
  openGraph: {
    title: "WeSharp — Bookings & collections in your portal",
    description:
      "See every upcoming visit across sites, edit windows, and confirm contacts — no calls, no email back-and-forth.",
    type: "website",
  },
};

export default function TradeCollectionsPage() {
  return (
    <MarketingArticle
      eyebrow="Portal features"
      title="Bookings &amp; collections"
      lead="Predictable route slots, named site contacts, and a self-service view of every upcoming visit — so brigades know when we&apos;re on the way and admin can amend without phoning the office."
    >
      <div className="space-y-10">
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">All your collections in one view</h2>
          <p>
            The bookings page in your{" "}
            <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
              customer portal
            </Link>{" "}
            shows every scheduled collection across your sites — date, time window, site contact, and current status —
            from confirmed to tentative to completed.
          </p>
          <PortalCollectionsMarketingPreview />
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Predictable routes, not last-minute scrambles</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="text-foreground">Recurring slots</span> — rolling programmes get the same route position
              each cycle, so brigades plan service days around them.
            </li>
            <li>
              <span className="text-foreground">Site-specific windows</span> — prep kitchens and service kitchens often
              need different windows; you can set those independently.
            </li>
            <li>
              <span className="text-foreground">Confirmed before route-out</span> — confirmations show clearly in the
              portal once a route is fixed, instead of a last-minute text the morning of.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Self-service amendments</h2>
          <p>
            Need to push a collection by a day, change the site contact, or add a new venue to the route? Most changes
            can be requested directly from the booking — no phone tag with the office. Bigger reshuffles still come
            with a human on the other end, but the routine stuff is one click.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Move date or window (subject to route capacity).</li>
            <li>Swap the on-site contact for that visit only.</li>
            <li>Add private access notes (gate codes, loading bays, delivery managers).</li>
            <li>Cancel with a clear timestamp on the order trail.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">Multi-site groups</h2>
          <p>
            Each site has its own named contact, address, and notes — but everything rolls up under one account so
            head office sees the whole route. Operators who run several brands or venues find this is the difference
            between a known schedule and a series of ad-hoc emails.
          </p>
          <p className="text-sm text-muted-foreground">
            Trade onboarding is where we agree how many sites, how often, and which contact owns each schedule — see{" "}
            <Link href="/trade-accounts" className="font-medium text-foreground underline underline-offset-4">
              trade accounts
            </Link>{" "}
            for the full onboarding picture.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">What this replaces</h2>
          <p>
            For most kitchens we replace a mix of WhatsApp threads, a paper diary at the pass, and a head-chef who
            remembers when the sharpening van last came. The portal turns that into something every shift can read
            without asking anyone.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Connected to everything else</h2>
          <p>
            Each booking links straight to its{" "}
            <Link href="/trade-accounts/order-tracking" className="font-medium text-foreground underline underline-offset-4">
              order &amp; workshop status
            </Link>
            , its{" "}
            <Link href="/trade-accounts/invoicing" className="font-medium text-foreground underline underline-offset-4">
              invoice
            </Link>
            , and the{" "}
            <Link href="/trade-accounts/knife-register" className="font-medium text-foreground underline underline-offset-4">
              blades
            </Link>{" "}
            that travelled with it — so a single collection can be reviewed end-to-end without flipping tools.
          </p>
        </section>
      </div>
    </MarketingArticle>
  );
}
