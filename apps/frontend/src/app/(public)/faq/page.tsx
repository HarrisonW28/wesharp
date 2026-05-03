import type { Metadata } from "next";
import Link from "next/link";

import { MarketingArticle } from "@/components/marketing/MarketingArticle";
import { Button } from "@/components/ui/button";
import { fetchPublicSiteContent } from "@/lib/site-content/fetch-site-content";

export const metadata: Metadata = {
  title: "FAQ | WeSharp",
  description:
    "Answers on booking, tracking, photos, subscriptions, coverage, safety, and invoices — before you send an enquiry.",
  openGraph: {
    title: "WeSharp — Frequently asked questions",
    description: "Knife sharpening FAQs for kitchens and home cooks in Greater Manchester & Liverpool.",
    type: "website",
  },
};

export const revalidate = 60;

export default async function FaqPage() {
  const site = await fetchPublicSiteContent();
  const fp = site.faq_page;
  const items = site.faq ?? [];

  return (
    <MarketingArticle showFooterCtas={false} title={fp.title} lead={fp.lead}>
      <dl className="space-y-4">
        {items.map(({ q, a }, i) => (
          <div key={`${i}-${q.slice(0, 24)}`} className="rounded-xl border bg-card px-5 py-4">
            <dt className="text-base font-medium text-foreground">{q}</dt>
            <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</dd>
          </div>
        ))}
      </dl>
      <section className="rounded-2xl border bg-muted/20 p-5 md:flex md:items-center md:justify-between md:gap-6 md:p-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">Still unsure?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Our team replies in business hours. For site rules or RAMS, say so in your message — we&apos;ll route it to the
            right person. You can also read{" "}
            <Link href="/safety" className="font-medium text-foreground underline underline-offset-4">
              safety &amp; trust
            </Link>{" "}
            or the{" "}
            <Link href="/how-it-works" className="font-medium text-foreground underline underline-offset-4">
              step-by-step process
            </Link>
            .
          </p>
        </div>
        <div className="mt-4 flex shrink-0 flex-col gap-2 sm:flex-row md:mt-0">
          <Button className="rounded-lg" asChild>
            <Link href="/contact">Contact us</Link>
          </Button>
          <Button variant="outline" className="rounded-lg" asChild>
            <Link href="/book">Book a collection</Link>
          </Button>
        </div>
      </section>
    </MarketingArticle>
  );
}
