import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
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
      <section
        id="portal-features"
        aria-labelledby="portal-features-heading"
        className="-mx-4 space-y-5 rounded-2xl border border-border/80 bg-gradient-to-b from-muted/40 to-muted/15 px-4 py-8 shadow-sm ring-1 ring-black/5 sm:-mx-0 sm:px-6 md:space-y-6 md:px-8 md:py-10 dark:ring-white/10"
      >
        <div className="space-y-2 text-center md:text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Customer portal</p>
          <h2
            id="portal-features-heading"
            className="text-balance text-xl font-semibold tracking-tight text-foreground md:text-2xl"
          >
            What you get in the portal
          </h2>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground md:mx-0 md:text-base">
            One signed-in workspace for your whole team — each card below opens a full walk-through with illustrative
            previews of the real screens.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
              className="group flex min-h-[7.5rem] flex-col gap-3 rounded-xl border border-border/80 bg-card p-4 shadow-sm transition-all hover:border-primary/50 hover:shadow-md md:p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                  aria-hidden
                />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-snug text-foreground md:text-base">{title}</span>
                <span className="mt-2 block text-xs leading-relaxed text-muted-foreground md:text-sm">{blurb}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

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
