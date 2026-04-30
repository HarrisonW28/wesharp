import Link from "next/link";

import { MarketingArticle } from "@/components/marketing/MarketingArticle";
import { Button } from "@/components/ui/button";

export default function ContactPage() {
  return (
    <MarketingArticle
      showFooterCtas={false}
      title="Contact"
      lead="Tell us what you need — new site, urgent collection, or a question about coverage and pricing. We reply during business hours."
    >
      <p>
        Email:&nbsp;
        <a href="mailto:hello@wesharp.uk" className="font-medium text-foreground underline underline-offset-4">
          hello@wesharp.uk
        </a>
      </p>
      <p>
        For the fastest route to a slot, include your postcode, roughly how many knives need attention, and when you need us.
      </p>
      <div className="pt-2">
        <Button className="rounded-lg" asChild>
          <Link href="/book">Book a collection</Link>
        </Button>
      </div>
    </MarketingArticle>
  );
}
