import { MarketingArticle } from "@/components/marketing/MarketingArticle";

export default function PricingPage() {
  return (
    <MarketingArticle
      title="Pricing"
      lead="Every kitchen is different — we price by volume, cadence, and how you like to run collections. Figures below are examples; we confirm a written quote before you commit."
    >
      <div className="rounded-2xl border bg-muted/40 p-6 text-foreground">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="text-sm font-semibold">Pay-as-you-go (example)</div>
            <div className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">From £8.50</div>
            <p className="mt-2 text-xs text-muted-foreground">Per knife on a typical ad-hoc collection — confirms on quote.</p>
          </div>
          <div>
            <div className="text-sm font-semibold">Regular programme (example)</div>
            <div className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">£49.00</div>
            <p className="mt-2 text-xs text-muted-foreground">Illustrative monthly bundle for scheduled visits — tailored when we meet.</p>
          </div>
        </div>
      </div>
      <p>
        Groups on a trade account often combine fixed routes with consolidated invoicing — see{" "}
        <a href="/trade-accounts" className="font-medium underline underline-offset-4">
          trade accounts
        </a>
        .
      </p>
    </MarketingArticle>
  );
}
