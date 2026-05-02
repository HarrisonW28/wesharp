import { MarketingArticle } from "@/components/marketing/MarketingArticle";
import { fetchPublicSiteContent } from "@/lib/site-content/fetch-site-content";

export const revalidate = 60;

export default async function FaqPage() {
  const site = await fetchPublicSiteContent();
  const fp = site.faq_page;
  const items = site.faq ?? [];

  return (
    <MarketingArticle title={fp.title} lead={fp.lead}>
      <dl className="space-y-4">
        {items.map(({ q, a }, i) => (
          <div key={`${i}-${q.slice(0, 24)}`} className="rounded-xl border bg-card px-5 py-4">
            <dt className="text-base font-medium text-foreground">{q}</dt>
            <dd className="mt-2 text-sm text-muted-foreground">{a}</dd>
          </div>
        ))}
      </dl>
    </MarketingArticle>
  );
}
