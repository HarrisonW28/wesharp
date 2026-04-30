import { MarketingArticle } from "@/components/marketing/MarketingArticle";

export default function HowItWorksPage() {
  return (
    <MarketingArticle
      title="How it works"
      lead="You book a collection. We route a driver. Knives go to our workshop, are sharpened and checked, then come home — with simple updates along the way."
    >
      <p>
        Start with a&nbsp;
        <a href="/book" className="font-medium text-foreground underline underline-offset-4">
          pickup request
        </a>
        &nbsp;— no account required. Already working with us?&nbsp;
        <a href="/login" className="font-medium text-foreground underline underline-offset-4">
          Sign in
        </a>
        &nbsp;to manage bookings, orders, and invoices in your account.
      </p>
      <p>
        We work in clear time windows so chefs know when to expect us. Every blade is tracked through sharpening and quality
        check before return, and your paperwork reflects what we actually processed.
      </p>
      <p className="text-sm text-muted-foreground">
        Our team uses specialist tools behind the scenes for routing and workshop progress — you get the simple customer view
        above.
      </p>
    </MarketingArticle>
  );
}
