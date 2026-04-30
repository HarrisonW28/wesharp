import Link from "next/link";

import { MarketingArticle } from "@/components/marketing/MarketingArticle";
import { Button } from "@/components/ui/button";

export default function ContactPage() {
  return (
    <MarketingArticle showFooterCtas={false} title="Contact" lead="Operational and commercial introductions flow through enquiry first — routing teams pick up promptly during business hours.">
      <p>
        Prefer email? Reach us at&nbsp;
        <a href="mailto:hello@wesharp.uk" className="font-medium text-foreground underline underline-offset-4">
          hello@wesharp.uk
        </a>
        &nbsp;(placeholder inbox for the MVP brochure site).
      </p>
      <p>Urgent pickups or multi-site introductions: outline timing, postcode, and headcount inside the enquiry so operations can prioritise routing.</p>
      <div className="pt-2">
        <Button asChild>
          <Link href="/book">Submit booking enquiry</Link>
        </Button>
      </div>
    </MarketingArticle>
  );
}
