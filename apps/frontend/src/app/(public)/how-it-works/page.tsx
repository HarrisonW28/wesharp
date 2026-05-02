import Link from "next/link";

import { MarketingArticle } from "@/components/marketing/MarketingArticle";
import { fetchPublicSiteContent } from "@/lib/site-content/fetch-site-content";

export const revalidate = 60;

export default async function HowItWorksPage() {
  const site = await fetchPublicSiteContent();
  const h = site.how_it_works;

  return (
    <MarketingArticle title={h.title} lead={h.lead}>
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
    </MarketingArticle>
  );
}
