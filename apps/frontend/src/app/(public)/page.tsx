import Link from "next/link";

import { HomeHero } from "@/components/marketing/HomeHero";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <section id="coverage" className="mx-auto max-w-6xl px-4 py-16 md:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              title: "We come to you",
              body: "Book a collection slot that fits prep and service — drivers follow clear day plans.",
            },
            {
              title: "Know where your knives are",
              body: "From collection to workshop to back on your rack — status stays visible in your account.",
            },
            {
              title: "Straightforward billing",
              body: "Invoices in GBP line up with what we sharpened — less back-and-forth at month-end.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="text-base font-semibold">{item.title}</div>
              <p className="mt-3 text-sm text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <Button variant="outline" asChild size="sm">
            <Link href="/service-areas">Areas we cover</Link>
          </Button>
        </div>
      </section>

      <section id="pricing" className="border-t bg-muted/25 py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <h2 className="text-2xl font-semibold tracking-tight">Pricing snapshot</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Commercial programmes vary by cadence and knife volumes — see the full&nbsp;
            <Link href="/pricing" className="font-medium text-foreground underline underline-offset-4 hover:no-underline">
              pricing overview
            </Link>
            &nbsp;for programme types.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border bg-background p-6">
              <div className="text-sm font-semibold">Pay-as-you-go</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">From £8.50</div>
              <div className="text-xs text-muted-foreground">Per knife · illustrative tier</div>
            </div>
            <div className="rounded-2xl border bg-background p-6">
              <div className="text-sm font-semibold">Subscriptions</div>
              <div className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">£49.00</div>
              <div className="text-xs text-muted-foreground">Monthly baseline · illustrative package</div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
