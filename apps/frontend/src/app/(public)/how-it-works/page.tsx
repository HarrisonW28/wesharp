import { MarketingArticle } from "@/components/marketing/MarketingArticle";

export default function HowItWorksPage() {
  return (
    <MarketingArticle
      title="How it works"
      lead="Pickup → workshop → sharpen → return — with tooling that keeps bookings, knives, invoices, and payments aligned."
    >
      <p>
        Commercial kitchens submit a&nbsp;
        <a href="/book" className="font-medium text-foreground underline underline-offset-4">
          booking enquiry
        </a>
        &nbsp;(no account needed) or use the&nbsp;
        <a href="/login" className="font-medium text-foreground underline underline-offset-4">
          tenant portal
        </a>
        &nbsp;if you’re already onboarded.
      </p>
      <p>
        Routes are scheduled around technician manifests: collections are pinned to booked windows, knives move through sharpening and QA checkpoints, and invoicing inherits what actually shipped.
      </p>
      <p>
        Administrators use the Ops console (<code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">/admin</code>) — field teams use Route Manager on mobile widths for stops and completions.
      </p>
    </MarketingArticle>
  );
}
