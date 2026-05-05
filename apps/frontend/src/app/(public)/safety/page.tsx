import type { Metadata } from "next";
import Link from "next/link";

import { MarketingArticle } from "@/components/marketing/MarketingArticle";
import { Button } from "@/components/ui/button";
import { fetchPublicSiteContent } from "@/lib/site-content/fetch-site-content";

export const metadata: Metadata = {
  title: "Safety & trust",
  description:
    "How WeSharp handles collections, custody, condition notes, and site rules — for professional kitchens and serious home cooks.",
  openGraph: {
    title: "WeSharp — Safety & trust",
    description: "Clear custody from collection to return. RAMS and site rules welcome.",
    type: "website",
  },
};

export const revalidate = 60;

export default async function SafetyPage() {
  const site = await fetchPublicSiteContent();
  const s = site.safety_page;

  return (
    <MarketingArticle showFooterCtas={false} title={s.title} lead={s.lead}>
      <ul className="list-disc space-y-2 pl-5">
        {(s.points ?? []).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">
        Details vary by site — if you need insurer or estate packs before the first visit, use{" "}
        <Link href="/contact" className="font-medium text-foreground underline underline-offset-4">
          Contact
        </Link>{" "}
        and we&apos;ll pick it up from there.
      </p>
      <div className="flex flex-wrap gap-3 border-t pt-8">
        <Button className="rounded-lg" asChild>
          <Link href="/book">Book a collection</Link>
        </Button>
        <Button variant="outline" className="rounded-lg" asChild>
          <Link href="/service-areas">Check coverage</Link>
        </Button>
        <Button variant="outline" className="rounded-lg" asChild>
          <Link href="/contact">Speak to the team</Link>
        </Button>
        <Button variant="ghost" className="rounded-lg" asChild>
          <Link href="/faq">Read FAQ</Link>
        </Button>
      </div>
    </MarketingArticle>
  );
}
