import type { Metadata } from "next";
import Link from "next/link";

import { MarketingArticle } from "@/components/marketing/MarketingArticle";
import {
  PortalInvoicingMarketingPreview,
} from "@/components/marketing/MarketingPortalPreviews";
import { PortalFeaturesBand } from "@/components/marketing/PortalFeaturesBand";

export const metadata: Metadata = {
  title: "Invoicing & finance",
  description:
    "Consolidated invoices, clear statuses, VAT-ready PDFs, and Stripe-handled card payments — built so your finance team can close the month without chasing.",
  openGraph: {
    title: "WeSharp — Invoicing & finance",
    description:
      "Per-site or group billing, payment statuses, and downloadable VAT receipts in the same portal as your operational data.",
    type: "website",
  },
};

export default function TradeInvoicingPage() {
  return (
    <MarketingArticle
      eyebrow="Portal features"
      title="Invoicing & finance"
      lead="Consolidated invoices, clear payment statuses, and downloadable VAT receipts — set up to match how your finance team already works."
    >
      <PortalFeaturesBand variant="compact" currentKey="invoicing" />

      <div className="space-y-10">
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">Everything finance needs, in one tab</h2>
          <p>
            The invoices view in your{" "}
            <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
              customer portal
            </Link>{" "}
            lists every bill we&apos;ve raised, with status, total, due date, and the site or programme line it relates
            to. Finance can filter to open or paid, drill into a row, and download the VAT-ready PDF — all from the
            same screen.
          </p>
          <PortalInvoicingMarketingPreview />
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Per-site or consolidated — your choice</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="text-foreground">Per-site invoices</span> when individual kitchens hold their own
              cost centre.
            </li>
            <li>
              <span className="text-foreground">Consolidated group invoices</span> when head office wants one document
              covering the whole month, with site-level breakdown inside.
            </li>
            <li>
              <span className="text-foreground">Subscription &amp; overage</span> appear as their own lines — included
              visits in plain English, then anything beyond your allowance for that period.
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">
            We agree the model during onboarding — see{" "}
            <Link href="/trade-accounts" className="font-medium text-foreground underline underline-offset-4">
              trade accounts
            </Link>{" "}
            for how that works.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Statuses you can act on</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="text-foreground">Awaiting payment</span> — issued, not yet paid; still within terms.
            </li>
            <li>
              <span className="text-foreground">Overdue</span> — past due date; highlighted so finance can act, not so
              we can chase you in five places.
            </li>
            <li>
              <span className="text-foreground">Scheduled</span> — subscription auto-charges that will run on a future
              date.
            </li>
            <li>
              <span className="text-foreground">Paid</span> — closed with a payment date and method on the record.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Pay how it suits you</h2>
          <p>
            Card payments are handled by{" "}
            <span className="font-medium text-foreground">Stripe</span> — finance teams can pay directly from the
            invoice page, and we never see card details. For agreed terms, bank transfer details are on the PDF and we
            reconcile against the invoice automatically.
          </p>
          <p className="text-sm text-muted-foreground">
            If your group needs net-30 or net-60, that&apos;s agreed in writing during onboarding, not invented
            invoice-by-invoice.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">What this replaces</h2>
          <p>
            For most kitchens we onboard, invoices were a monthly PDF buried in an inbox attachment — sometimes addressed
            to a chef who has since moved on. The portal puts every invoice next to the order, collection, and blade
            list it relates to — so any line item can be traced back to what was actually done, in seconds.
          </p>
          <p className="text-sm text-muted-foreground">
            Jump to those linked areas using the{" "}
            <Link href="#portal-features" className="font-medium text-foreground underline underline-offset-4">
              feature cards
            </Link>{" "}
            at the top of the page.
          </p>
        </section>
      </div>
    </MarketingArticle>
  );
}
