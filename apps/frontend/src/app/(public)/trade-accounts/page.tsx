import { MarketingArticle } from "@/components/marketing/MarketingArticle";

export default function TradeAccountsPage() {
  return (
    <MarketingArticle
      title="Trade accounts"
      lead="Hospitality groups consolidate collections, invoicing, and onboarding under a governed trade relationship."
    >
      <ul className="list-disc space-y-2 pl-5">
        <li>Named contacts and invoicing workflows per outlet</li>
        <li>Cadenced routes prioritised alongside walk-up demand</li>
        <li>Portal access for bookings, orders, knives, and invoices across your tenancy</li>
      </ul>
      <p>Start via the booking enquiry — our team attaches your organisation to Stripe-backed billing when you qualify.</p>
    </MarketingArticle>
  );
}
