import { MarketingArticle } from "@/components/marketing/MarketingArticle";

export default function FaqPage() {
  const items = [
    {
      q: "Do I need an account to book?",
      a: "No. Send a collection enquiry with your details and we’ll get back to you to confirm timing. Once you’re a regular customer, a free account helps you track bookings, orders, and invoices.",
    },
    {
      q: "How long does sharpening take?",
      a: "It depends on how many knives you send and our route schedule. We’ll give you an expected return date when we confirm your collection — not a vague “soon”.",
    },
    {
      q: "Can I track my knives?",
      a: "Yes. With a free account you can see bookings and orders in one place — from collection through the workshop to return.",
    },
    {
      q: "Will I see photos of my knives?",
      a: "When your programme includes customer-visible evidence, timestamped photos can appear in your portal. Internal-only shots never show in your account.",
    },
    {
      q: "Do you offer subscription-style plans?",
      a: "Yes. Busy kitchens often use rolling programmes with included visits and allowances. Read our subscriptions page for an overview, then we’ll quote properly for your volumes.",
    },
    {
      q: "How do invoices and payment work?",
      a: "We raise invoices in GBP for the work we’ve done. In your account you can see what’s outstanding; our team will agree payment terms with you when you’re set up.",
    },
    {
      q: "Where do you collect?",
      a: "We currently serve Greater Manchester and Liverpool. Add your postcode when you book — we’ll only confirm if you’re in an area we cover.",
    },
    {
      q: "Do you work with restaurants only?",
      a: "We work with professional kitchens of all sizes — restaurants, hotels, butchers, caterers — and with serious home cooks who want the same service.",
    },
  ];

  return (
    <MarketingArticle title="FAQ" lead="Straight answers before you book. If something’s not here, use Contact and we’ll reply in working hours.">
      <dl className="space-y-4">
        {items.map(({ q, a }) => (
          <div key={q} className="rounded-xl border bg-card px-5 py-4">
            <dt className="text-base font-medium text-foreground">{q}</dt>
            <dd className="mt-2 text-sm text-muted-foreground">{a}</dd>
          </div>
        ))}
      </dl>
    </MarketingArticle>
  );
}
