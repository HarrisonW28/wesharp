import Link from "next/link";

import { MarketingArticle } from "@/components/marketing/MarketingArticle";
import { Button } from "@/components/ui/button";
import { fetchPublicSiteContent } from "@/lib/site-content/fetch-site-content";

export const revalidate = 60;

export default async function ContactPage() {
  const site = await fetchPublicSiteContent();
  const c = site.contact;
  const email = c.support_email || "hello@wesharp.uk";
  const phone = (c.support_phone ?? "").trim();

  return (
    <MarketingArticle showFooterCtas={false} title={c.title} lead={c.lead}>
      <p>
        Email:&nbsp;
        <a href={`mailto:${email}`} className="font-medium text-foreground underline underline-offset-4">
          {email}
        </a>
      </p>
      {phone ? (
        <p>
          Phone:&nbsp;
          <a href={`tel:${phone.replace(/\s+/g, "")}`} className="font-medium text-foreground underline underline-offset-4">
            {phone}
          </a>
        </p>
      ) : null}
      <p>{c.hint_paragraph}</p>
      <p className="text-sm text-muted-foreground">{site.business.hours_line}</p>
      <div className="flex flex-wrap gap-3 pt-2">
        <Button className="rounded-lg" asChild>
          <Link href="/book">{c.cta_book}</Link>
        </Button>
        <Button variant="outline" className="rounded-lg" asChild>
          <Link href="/service-areas">Check coverage</Link>
        </Button>
      </div>
    </MarketingArticle>
  );
}
