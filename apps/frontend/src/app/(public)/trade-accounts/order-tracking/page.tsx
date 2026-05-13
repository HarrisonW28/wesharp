import type { Metadata } from "next";
import Link from "next/link";

import { MarketingArticle } from "@/components/marketing/MarketingArticle";
import {
  PortalOrderTrackingMarketingPreview,
  PortalQualityHighlightsStrip,
} from "@/components/marketing/MarketingPortalPreviews";
import { PortalFeaturesBand } from "@/components/marketing/PortalFeaturesBand";

export const metadata: Metadata = {
  title: "Order tracking & workshop visibility",
  description:
    "Follow every collection through the WeSharp workshop — live status, timestamped photos, inspection notes, and damage reports inside your customer portal.",
  openGraph: {
    title: "WeSharp — Order tracking & workshop visibility",
    description:
      "No more chasing the workshop. See pickup, sharpening, QA, and return milestones with photo evidence in your portal.",
    type: "website",
  },
};

export default function TradeOrderTrackingPage() {
  return (
    <MarketingArticle
      eyebrow="Portal features"
      title="Order tracking & workshop visibility"
      lead="See exactly where every batch of knives is — from pickup at the kitchen door to the workshop bench and back — without phoning the shop or chasing email threads."
    >
      <PortalFeaturesBand variant="compact" currentKey="order-tracking" />

      <div className="space-y-10">
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">A live status that your team actually trusts</h2>
          <p>
            Each order has its own page in the{" "}
            <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
              customer portal
            </Link>
            . Status moves through clear milestones as the workshop logs each step, so chefs, GMs, and finance read the same
            picture — no &ldquo;is it ready yet?&rdquo; calls.
          </p>
          <PortalOrderTrackingMarketingPreview />
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Photo evidence at each stage</h2>
          <p>
            Where your programme includes evidence, our workshop attaches timestamped photos to your order — pickup
            condition, in-workshop, after sharpening, and the QA pass. Useful when a brigade rotates blades between
            sites, or when finance needs sign-off before approving a recharge.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="text-foreground">Pickup photos</span> — what you handed over, recorded on day one so
              there&apos;s never a dispute about damage that arrived with us.
            </li>
            <li>
              <span className="text-foreground">Workshop &amp; after photos</span> — what the bench did to each blade,
              tagged against the knife&apos;s register entry.
            </li>
            <li>
              <span className="text-foreground">QA photos</span> — a final check before we drive the box back to your
              kitchen.
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">Inspection notes &amp; damage reports</h2>
          <p>
            If we spot tip damage, heat-treatment issues, or rolled edges, the workshop writes it up on the order in
            plain language — not just a status code. Severity, what we did about it, and whether there is a charge are
            all on the same screen.
          </p>
          <p className="text-sm text-muted-foreground">
            For multi-site groups, this means head office can audit any blade&apos;s history in seconds rather than
            asking three kitchens to dig through paperwork.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">What this replaces for kitchens we onboard</h2>
          <p>
            Most suppliers we replace send a paper docket on the day and a PDF invoice a fortnight later. Between those
            two pieces of paper, no one knows what is happening. Our portal closes that gap:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>No more phone calls to confirm a knife is on the way back.</li>
            <li>No more chasing photos by email for an insurance claim or supplier review.</li>
            <li>No more reconciling paper dockets against an invoice at month-end.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">How we hold a quality bar — visibly</h2>
          <p>
            Each order is sharpened to spec for the blade type, sanitised on receipt and again before return, and
            reconciled against your{" "}
            <Link href="/trade-accounts/knife-register" className="font-medium text-foreground underline underline-offset-4">
              kit register
            </Link>{" "}
            before the order closes.
          </p>
          <PortalQualityHighlightsStrip />
        </section>

      </div>
    </MarketingArticle>
  );
}
