import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";

import { MarketingArticle } from "@/components/marketing/MarketingArticle";
import { Button } from "@/components/ui/button";
import { fetchPublicSiteContent } from "@/lib/site-content/fetch-site-content";

export const metadata: Metadata = {
  title: "Services | WeSharp",
  description:
    "Door-to-door knife sharpening: collection, workshop sharpening, tracked return. Pay-as-you-go or subscription programmes — all in GBP.",
  openGraph: {
    title: "WeSharp — Knife sharpening services",
    description: "Professional sharpening with collection and return. See packages and booking options.",
    type: "website",
  },
};

export const revalidate = 60;

export default async function ServicesPage() {
  const site = await fetchPublicSiteContent();
  const s = site.services;

  return (
    <MarketingArticle showFooterCtas={false} title={s.title} lead={s.lead}>
      <section className="space-y-4 rounded-2xl border bg-muted/30 p-5 md:p-6">
        <h2 className="text-base font-semibold text-foreground">Home &amp; kitchen packages</h2>
        <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
          Whether you sharpen once in a while or every month, you can start with a{" "}
          <strong className="font-medium text-foreground">single collection</strong> or move onto a{" "}
          <strong className="font-medium text-foreground">rolling programme</strong> with included visits and knife
          allowances. All published prices and calculator output are in <strong className="font-medium text-foreground">GBP (£)</strong>{" "}
          and come from the same rules we use when we raise a quote.
        </p>
        <div className="grid gap-4 pt-1 md:grid-cols-2">
          <div className="rounded-xl border bg-background p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">Pay as you go</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Per-visit pricing for collection or onsite work — ideal if you want to try us once or book occasionally.
            </p>
            <Button variant="link" className="mt-1 h-auto p-0 text-primary" asChild>
              <Link href="/pricing">
                Open price guide &amp; calculator <ArrowRight className="ml-1 inline h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          </div>
          <div className="rounded-xl border bg-background p-4 shadow-sm ring-1 ring-primary/10">
            <h3 className="text-sm font-semibold text-foreground">Subscription / programme</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Bundled monthly pricing with included collections and knife caps — overage is calculated in your account when
              you go above what&apos;s included.
            </p>
            <Button variant="link" className="mt-1 h-auto p-0 text-primary" asChild>
              <Link href="/subscriptions">
                View programmes <ArrowRight className="ml-1 inline h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Commercial &amp; multi-site</h2>
        <p className="text-sm leading-relaxed md:text-base">
          For groups, hotels, and suppliers we align routes, programmes, and invoicing so finance sees one predictable rhythm
          — while each site still tracks its own knives in the portal.
        </p>
        <Button variant="outline" className="rounded-lg" asChild>
          <Link href="/trade-accounts">Trade accounts &amp; hospitality</Link>
        </Button>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">What we do</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm md:text-base">
          <li>Scheduled collection from your venue in an agreed time window.</li>
          <li>Each blade logged so nothing goes missing — matched to your order in the portal.</li>
          <li>Professional sharpening and inspection in our workshop.</li>
          <li>
            Return delivery with blades ready for service. Where your programme includes customer-visible evidence,
            timestamped photos can appear in your account.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Pickup, return &amp; onsite</h2>
        <p>
          Most kitchens choose pickup and return: we take knives away, sharpen them, and bring them back on a follow-up run.
          Turnaround depends on route and volume — we&apos;ll give you a realistic date when we confirm your booking.
        </p>
        <p>
          For some sites we can sharpen on premises. Say so on your enquiry — we&apos;ll confirm if it fits your location and
          setup.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">Coverage &amp; booking</h2>
        <p className="text-sm leading-relaxed">
          Check your postcode before you commit — our live tool uses the same service-area rules as booking and the pricing
          API.
        </p>
        <Button variant="outline" className="rounded-lg" asChild>
          <Link href="/service-areas">
            <MapPin className="mr-2 h-4 w-4" aria-hidden />
            Check coverage
          </Link>
        </Button>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">After you book</h2>
        <p className="mb-0 text-sm md:text-base">
          Create a free account when you&apos;re ready to track collections, orders, and invoices — or start with an
          enquiry and we&apos;ll guide you.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button className="rounded-lg" asChild>
            <Link href="/book">Book a collection</Link>
          </Button>
          <Button variant="outline" className="rounded-lg" asChild>
            <Link href="/pricing">Pricing calculator</Link>
          </Button>
          <Button variant="ghost" className="rounded-lg" asChild>
            <Link href="/contact">Ask a question</Link>
          </Button>
        </div>
      </section>
    </MarketingArticle>
  );
}
