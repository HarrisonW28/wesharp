import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

type MarketingArticleProps = {
  title: string;
  lead?: string;
  showFooterCtas?: boolean;
  children: ReactNode;
};

/** Long-form marketing pages. Render inside `app/(public)` so `(public)/layout` supplies the site header/footer once. */
export function MarketingArticle({ title, lead, showFooterCtas = true, children }: MarketingArticleProps) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:py-16 md:px-6 lg:py-20">
      <p className="text-sm font-medium text-primary">WeSharp · Commercial sharpening</p>
      <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight">{title}</h1>
      {lead ? <p className="mt-4 max-w-prose text-base leading-relaxed text-muted-foreground">{lead}</p> : null}
      <div className="mt-10 space-y-5 text-sm leading-relaxed text-muted-foreground md:text-base">{children}</div>
      {showFooterCtas ? (
        <div className="mt-12 flex flex-wrap gap-3 border-t pt-8">
          <Button asChild>
            <Link href="/book">Request a pickup</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/contact">Contact</Link>
          </Button>
        </div>
      ) : null}
    </article>
  );
}
