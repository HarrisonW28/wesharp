import Link from "next/link";

import { MarketingArticle } from "@/components/marketing/MarketingArticle";

export default function TradeAccountsPage() {
  return (
    <MarketingArticle
      eyebrow="Restaurants, groups & suppliers"
      title="For business & trade kitchens"
      lead="Whether you run one busy site or many, we make collections, tracking, and billing predictable — without drowning you in jargon."
    >
      <ul className="list-disc space-y-2 pl-5">
        <li>Named contacts per site and invoices that match how your finance team already works.</li>
        <li>Regular route slots so brigades know when we&apos;re on the way — not last-minute guesswork.</li>
        <li>
          Your team uses the same{" "}
          <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
            customer portal
          </Link>{" "}
          to book, follow orders, see knives, and download invoices — everything in one place.
        </li>
      </ul>
      <p>
        Tell us about your sites on the booking form — we&apos;ll agree terms, payment rhythm, and who gets logins before
        anything goes live.
      </p>
      <p className="text-sm text-muted-foreground">
        Already on a programme? Explore{" "}
        <Link href="/subscriptions" className="font-medium text-foreground underline underline-offset-4">
          how subscriptions work
        </Link>{" "}
        for kitchens like yours.
      </p>
    </MarketingArticle>
  );
}
