import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  CalendarClock,
  ClipboardList,
  Package,
  Receipt,
} from "lucide-react";

import { MarketingArticle } from "@/components/marketing/MarketingArticle";
import { PortalOverviewMarketingPreview } from "@/components/marketing/MarketingPortalPreviews";

export const metadata: Metadata = {
  title: "Trade & business kitchens",
  description:
    "Multi-site knife sharpening with predictable routes, consolidated billing, and a shared customer portal for bookings, orders, and invoices.",
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
        <h2 className="text-base font-semibold text-foreground">What teams see online</h2>
        <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
          After onboarding, everyone you invite works from the same overview — next collection, live orders, and
          invoices — before drilling into detail.
        </p>
        <PortalOverviewMarketingPreview />
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Explore the portal feature by feature</h2>
        <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
          Each link below opens a deeper look at one part of the same signed-in workspace — with illustrative previews
          of what you and your team would actually see day to day.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            {
              href: "/trade-accounts/order-tracking",
              icon: Package,
              title: "Order tracking & workshop visibility",
              blurb: "Live status, photo evidence at each stage, inspections, and damage reports per order.",
            },
            {
              href: "/trade-accounts/knife-register",
              icon: ClipboardList,
              title: "Knife register & blade history",
              blurb: "Tagged blades, per-knife inspections and photos, and multi-site audits in one register.",
            },
            {
              href: "/trade-accounts/collections",
              icon: CalendarClock,
              title: "Bookings & collections",
              blurb: "Recurring route slots, per-site windows, named contacts, and self-service amendments.",
            },
            {
              href: "/trade-accounts/invoicing",
              icon: Receipt,
              title: "Invoicing & finance",
              blurb: "Consolidated billing, payment statuses, VAT-ready PDFs, and Stripe-handled card payments.",
            },
            {
              href: "/trade-accounts/reporting",
              icon: BarChart3,
              title: "Reporting & dashboards",
              blurb: "Cross-site overview, subscription allowances, and finance-friendly invoice lists.",
            },
          ].map(({ href, icon: Icon, title, blurb }) => (
            <Link
              key={href}
              href={href}
              className="group flex gap-3 rounded-xl border border-border/80 bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/30"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-snug text-foreground">{title}</span>
                <span className="mt-1 block text-xs leading-snug text-muted-foreground">{blurb}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <p>
        Tell us about your sites on the booking form — we&apos;ll agree terms, payment rhythm, and who gets logins before
        anything goes live.
      </p>
      <p className="text-sm text-muted-foreground">
        Already on a programme? Explore{" "}
        <Link href="/subscriptions" className="font-medium text-foreground underline underline-offset-4">
          how subscriptions work
        </Link>{" "}
        for kitchens like yours. Curious what teams see once they&apos;re logged in? Read{" "}
        <Link href="/trade-accounts/reporting" className="font-medium text-foreground underline underline-offset-4">
          reporting &amp; dashboards
        </Link>
        .
      </p>
    </MarketingArticle>
  );
}
