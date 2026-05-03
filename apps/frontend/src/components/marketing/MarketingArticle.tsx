import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

type MarketingArticleProps = {
  /** Small line above H1 — keep customer-facing, not internal. */
  eyebrow?: string;
  title: string;
  lead?: string;
  showFooterCtas?: boolean;
  children: ReactNode;
};

/** Long-form marketing pages. Render inside `app/(public)` so `(public)/layout` supplies the site header/footer once. */
export function MarketingArticle({
  eyebrow = "WeSharp · Professional knife sharpening",
  title,
  lead,
  showFooterCtas = true,
  children,
}: MarketingArticleProps) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:py-16 md:px-6 lg:py-20">
      <p className="text-sm font-medium text-primary">{eyebrow}</p>
      <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight">{title}</h1>
      {lead ? <p className="mt-4 max-w-prose text-base leading-relaxed text-muted-foreground">{lead}</p> : null}
      <div className="mt-10 space-y-5 text-sm leading-relaxed text-muted-foreground md:text-base">{children}</div>
      {showFooterCtas ? (
        <div className="mt-12 flex flex-wrap gap-3 border-t pt-8">
          <Button className="rounded-lg" asChild>
            <Link href="/book">
              Book a collection
              <span className="sr-only"> — starts your enquiry</span>
            </Link>
          </Button>
          <Button variant="outline" className="rounded-lg" asChild>
            <Link href="/service-areas">Check coverage</Link>
          </Button>
          <Button variant="ghost" className="rounded-lg" asChild>
            <Link href="/contact">Ask a question</Link>
          </Button>
        </div>
      ) : null}
    </article>
  );
}
