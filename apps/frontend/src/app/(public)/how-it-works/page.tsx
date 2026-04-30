import Link from "next/link";

import { MarketingArticle } from "@/components/marketing/MarketingArticle";

export default function HowItWorksPage() {
  return (
    <MarketingArticle
      title="How it works"
      lead="You book a collection. We collect your knives, sharpen and inspect them in our workshop, then return them — with clear updates so you’re never left guessing."
    >
      <ol className="list-decimal space-y-4 pl-5">
        <li>
          <strong className="font-medium text-foreground">Book</strong> —{" "}
          <Link href="/book" className="font-medium text-foreground underline underline-offset-4">
            Request a collection
          </Link>
          . No account is required for your first enquiry.
        </li>
        <li>
          <strong className="font-medium text-foreground">Collect</strong> — We arrive in an agreed window, log each blade, and
          transport everything safely to our workshop.
        </li>
        <li>
          <strong className="font-medium text-foreground">Sharpen &amp; check</strong> — Professional edges and a quality pass
          before anything leaves the workshop.
        </li>
        <li>
          <strong className="font-medium text-foreground">Return</strong> — Your knives come back ready to use. If you have an
          account, you can follow bookings and orders there.
        </li>
      </ol>
      <p>
        Already a customer?{" "}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Sign in
        </Link>{" "}
        to manage bookings, orders, and invoices.
      </p>
    </MarketingArticle>
  );
}
