import { HomeHero } from "@/components/marketing/HomeHero";

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <section id="coverage" className="mx-auto max-w-6xl px-4 py-16 md:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              title: "Pickup scheduling",
              body: "Align kitchens with technician routes — fewer surprises during service.",
            },
            {
              title: "Custody visibility",
              body: "Know exactly where knives are across sharpening and return logistics.",
            },
            {
              title: "Billing integrity",
              body: "Invoices that reconcile cleanly with Stripe — fewer month-end mysteries.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="text-base font-semibold">{item.title}</div>
              <p className="mt-3 text-sm text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="border-t bg-muted/25 py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <h2 className="text-2xl font-semibold tracking-tight">Pricing snapshot</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Commercial programmes vary by cadence and knife volumes — mock figures shown until catalogue APIs ship.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border bg-background p-6">
              <div className="text-sm font-semibold">Pay-as-you-go</div>
              <div className="mt-3 text-3xl font-semibold tracking-tight">From £8.50</div>
              <div className="text-xs text-muted-foreground">Per knife · illustrative tier</div>
            </div>
            <div className="rounded-2xl border bg-background p-6">
              <div className="text-sm font-semibold">Subscriptions</div>
              <div className="mt-3 text-3xl font-semibold tracking-tight">£49</div>
              <div className="text-xs text-muted-foreground">Monthly baseline · illustrative package</div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
