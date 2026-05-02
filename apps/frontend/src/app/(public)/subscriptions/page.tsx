import Link from "next/link";

import { MarketingArticle } from "@/components/marketing/MarketingArticle";
import { PRICING } from "@/config/pricing";
import { formatGBP } from "@/lib/format/money";

export default function SubscriptionsPage() {
  const example = formatGBP(PRICING.subscriptionMonthlyMinor);

  return (
    <MarketingArticle
      eyebrow="Care plans for busy kitchens"
      title="Subscriptions & regular programmes"
      lead="If you run knives through the pass every week, ad-hoc collections aren’t always enough. We offer rolling routes and care-style programmes with included visits and knife allowances — so you know when we’re coming and what’s covered."
    >
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">What you get</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Scheduled collections aligned with your openings — fewer surprises on the diary.</li>
          <li>A clear allowance for collections and knives each period; we&apos;ll explain overage in plain English before you commit.</li>
          <li>
            Your own{" "}
            <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
              customer portal
            </Link>{" "}
            to see usage, invoices, and friendly summaries — not spreadsheets.
          </li>
        </ul>
      </section>
      <section className="space-y-3 rounded-xl border bg-card p-5 text-foreground">
        <h2 className="text-base font-semibold">Indicative pricing</h2>
        <p className="text-sm text-muted-foreground">
          Every kitchen is different. As a guide, monthly programmes often start around{" "}
          <span className="font-semibold tabular-nums text-foreground">{example}</span> — we&apos;ll confirm a written
          quote after we understand your volumes and how often you need us.
        </p>
        <p className="text-sm text-muted-foreground">
          Larger groups and multi-site teams usually pair a programme with{" "}
          <Link href="/trade-accounts" className="font-medium text-foreground underline underline-offset-4">
            a business account
          </Link>{" "}
          so invoicing stays simple.
        </p>
      </section>
      <p>
        Not sure yet? Start with a{" "}
        <Link href="/book" className="font-medium text-foreground underline underline-offset-4">
          one-off collection
        </Link>{" "}
        — we can move you onto a programme once you&apos;ve seen how we work.
      </p>
    </MarketingArticle>
  );
}
