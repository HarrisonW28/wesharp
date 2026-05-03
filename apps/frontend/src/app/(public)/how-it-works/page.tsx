import type { Metadata } from "next";
import Link from "next/link";
import { Building2, HelpCircle, MapPin, Shield } from "lucide-react";

import { MarketingArticle } from "@/components/marketing/MarketingArticle";
import { Button } from "@/components/ui/button";
import { fetchPublicSiteContent } from "@/lib/site-content/fetch-site-content";

export const metadata: Metadata = {
  title: "How it works | WeSharp",
  description:
    "Collection, workshop sharpening, quality check, and return — with logging, optional photo evidence in your portal, and clear handovers for professional kitchens.",
  openGraph: {
    title: "WeSharp — How knife sharpening works",
    description: "From booking to blades back on the rack: custody, QA, and customer-visible updates.",
    type: "website",
  },
};

export const revalidate = 60;

export default async function HowItWorksPage() {
  const site = await fetchPublicSiteContent();
  const h = site.how_it_works;

  return (
    <MarketingArticle title={h.title} lead={h.lead} showFooterCtas={false}>
      <ol className="list-decimal space-y-4 pl-5">
        {(h.steps ?? []).map((step, idx) => (
          <li key={`${step.title}-${idx}`}>
            <strong className="font-medium text-foreground">{step.title}</strong>
            {" — "}
            {idx === 0 ? (
              <>
                <Link href="/book" className="font-medium text-foreground underline underline-offset-4">
                  Request a collection
                </Link>
                . {step.body}
              </>
            ) : (
              step.body
            )}
          </li>
        ))}
      </ol>

      <section className="grid gap-4 rounded-2xl border bg-muted/25 p-5 md:grid-cols-2 md:p-6">
        <Link
          href="/safety"
          className="flex gap-3 rounded-xl border bg-background p-4 shadow-sm outline-offset-2 transition-colors hover:bg-muted/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="font-semibold text-foreground">Safety &amp; trust</p>
            <p className="mt-1 text-sm text-muted-foreground">Custody, access windows, and how we handle site rules.</p>
          </div>
        </Link>
        <Link
          href="/service-areas"
          className="flex gap-3 rounded-xl border bg-background p-4 shadow-sm outline-offset-2 transition-colors hover:bg-muted/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        >
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="font-semibold text-foreground">Check coverage</p>
            <p className="mt-1 text-sm text-muted-foreground">Postcode checker before you book — same rules as enquiry and pricing.</p>
          </div>
        </Link>
        <Link
          href="/trade-accounts"
          className="flex gap-3 rounded-xl border bg-background p-4 shadow-sm outline-offset-2 transition-colors hover:bg-muted/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="font-semibold text-foreground">Business &amp; multi-site</p>
            <p className="mt-1 text-sm text-muted-foreground">Trade accounts for consistent invoicing across venues.</p>
          </div>
        </Link>
        <Link
          href="/faq"
          className="flex gap-3 rounded-xl border bg-background p-4 shadow-sm outline-offset-2 transition-colors hover:bg-muted/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        >
          <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="font-semibold text-foreground">FAQ</p>
            <p className="mt-1 text-sm text-muted-foreground">RAMS, photos, accounts, and timing — in plain English.</p>
          </div>
        </Link>
      </section>

      <p>
        {h.subscriptions_prompt}{" "}
        <Link href="/subscriptions" className="font-medium text-foreground underline underline-offset-4">
          {h.subscriptions_link_label}
        </Link>
        .
      </p>
      <p>
        {h.customer_signin_prompt}{" "}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          {h.customer_signin_link_label}
        </Link>{" "}
        {h.customer_signin_suffix}
      </p>
      <div className="flex flex-wrap gap-3 border-t pt-6">
        <Button className="rounded-lg" asChild>
          <Link href="/book">Book a collection</Link>
        </Button>
        <Button variant="outline" className="rounded-lg" asChild>
          <Link href="/service-areas">Check coverage</Link>
        </Button>
        <Button variant="outline" className="rounded-lg" asChild>
          <Link href="/contact">Contact the team</Link>
        </Button>
      </div>
    </MarketingArticle>
  );
}
