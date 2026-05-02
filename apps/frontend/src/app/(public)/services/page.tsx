import Link from "next/link";

import { MarketingArticle } from "@/components/marketing/MarketingArticle";
import { Button } from "@/components/ui/button";

export default function ServicesPage() {
  return (
    <MarketingArticle
      showFooterCtas={false}
      title="Services"
      lead="Door-to-door knife sharpening for busy kitchens. You keep cooking — we handle collection, workshop sharpening, quality checks, and safe return."
    >
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">What we do</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Scheduled collection from your venue at an agreed time window.</li>
          <li>Careful logging of each blade so nothing goes missing — matched to your order in the portal.</li>
          <li>Professional sharpening and inspection in our workshop.</li>
          <li>
            Return delivery with blades ready for service. Where your programme includes customer-visible photos, they
            appear in your account with timestamps so you can see work was completed.
          </li>
        </ul>
      </section>
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Pickup and return</h2>
        <p>
          Most customers choose pickup and return: we take knives away, sharpen them, and bring them back on a follow-up run.
          Turnaround depends on route and volume — we&apos;ll give you a realistic date when we confirm your booking.
        </p>
      </section>
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">On-site sharpening</h2>
        <p>
          For some sites we can sharpen on premises instead of taking blades away. Mention this on your enquiry if it suits
          you better — we&apos;ll say whether we can do it for your location and setup.
        </p>
      </section>
      <section className="space-y-4 rounded-xl border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">After you book</h2>
        <p className="mb-0">
          Create a free account when you&apos;re ready to track collections, see orders, and manage invoices — or start with
          an enquiry and we&apos;ll guide you from there.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button className="rounded-lg" asChild>
            <Link href="/book">Book a collection</Link>
          </Button>
          <Button variant="outline" className="rounded-lg" asChild>
            <Link href="/pricing">View pricing</Link>
          </Button>
          <Button variant="ghost" className="rounded-lg" asChild>
            <Link href="/service-areas">Areas we cover</Link>
          </Button>
        </div>
      </section>
    </MarketingArticle>
  );
}
