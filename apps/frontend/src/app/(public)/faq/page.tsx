import { MarketingArticle } from "@/components/marketing/MarketingArticle";

export default function FaqPage() {
  const items = [
    {
      q: "Do I need an account to request pickup?",
      a: "No — use the booking enquiry route. Operators convert qualified leads into companies, locations, and requested bookings.",
    },
    {
      q: "How do invoices work?",
      a: "Invoices are raised from your knife orders. In your account you can see what’s outstanding; our team handles payment setup.",
    },
    {
      q: "What is Route Manager?",
      a: "A mobile-focused shell around today’s operational route, manifests, stops, and completion actions — optimised for thumbs and outdoor lighting.",
    },
    {
      q: "Which cities are live for the demo?",
      a: "Seeded data focuses on Greater Manchester & Liverpool — production coverage follows the configured service_areas table.",
    },
  ];

  return (
    <MarketingArticle title="FAQ" lead="Straight answers around the MVP feature slice.">
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
