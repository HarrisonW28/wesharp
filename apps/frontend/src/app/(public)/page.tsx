import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { HomeHero } from "@/components/marketing/HomeHero";
import { Button } from "@/components/ui/button";
import { PRICING } from "@/config/pricing";
import { SERVICE_AREAS } from "@/config/service-areas";
import { formatGBP } from "@/lib/format/money";

const HOW_STEPS = [
  { step: 1, title: "Book your collection", body: "Pick a date and time window that works around service — online, in minutes." },
  { step: 2, title: "We collect your knives", body: "Our driver comes to you, logs each blade, and takes them to our workshop." },
  { step: 3, title: "We sharpen and inspect them", body: "Professional edges, quality check, and careful handling throughout." },
  { step: 4, title: "We return them ready to use", body: "Your knives come back sharp, safe, and ready for the next service." },
] as const;

const WHO_FOR = [
  "Restaurants",
  "Hotels",
  "Butchers",
  "Caterers",
  "Chefs",
  "Home kitchens",
] as const;

const BENEFITS = [
  { title: "Convenient collection", body: "We come to your door — no need to post blades or lose a whole day." },
  { title: "Professional sharpening", body: "Workshop-grade equipment and experienced sharpeners on every job." },
  { title: "Order tracking", body: "See where things stand in your WeSharp account from collection to return." },
  { title: "Invoices and spend history", body: "Clear GBP invoices and a record of what you have had sharpened." },
  { title: "Repeat service and programmes", body: "Ideal for busy kitchens — ask us about regular runs and subscription-style plans." },
] as const;

export default function HomePage() {
  const paygFromMinor = Math.min(...PRICING.tiers.map((t) => t.unitAmountMinor));
  const subscriptionDisplay = formatGBP(PRICING.subscriptionMonthlyMinor);

  return (
    <>
      <HomeHero />

      <section id="how-it-works" className="scroll-mt-20 border-b bg-background py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">How it works</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground md:text-base">
            Four simple steps from booking to blades back on your rack.
          </p>
          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_STEPS.map(({ step, title, body }) => (
              <li
                key={step}
                className="relative rounded-2xl border bg-card p-6 shadow-sm"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                  {step}
                </span>
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex justify-center">
            <Button variant="outline" className="rounded-lg" asChild>
              <Link href="/how-it-works">More detail</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-muted/30 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">Who it&apos;s for</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground md:text-base">
            From brigades to home cooks — if you rely on sharp knives, we can help.
          </p>
          <ul className="mt-10 flex flex-wrap justify-center gap-3">
            {WHO_FOR.map((label) => (
              <li
                key={label}
                className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium shadow-sm"
              >
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-b py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">Why kitchens choose WeSharp</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map(({ title, body }) => (
              <div key={title} className="flex gap-4 rounded-2xl border bg-card p-6 shadow-sm">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="areas" className="border-b bg-muted/25 py-14 md:py-16">
        <div className="mx-auto max-w-7xl px-4 text-center md:px-8">
          <h2 className="text-xl font-semibold tracking-tight md:text-2xl">Areas we cover</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Tell us your postcode when you book — we&apos;ll confirm you&apos;re in range.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {SERVICE_AREAS.map((area) => (
              <span key={area.id} className="rounded-full border bg-background px-3 py-1.5 text-sm">
                {area.label}
              </span>
            ))}
          </div>
          <Button className="mt-8 rounded-lg" variant="outline" asChild>
            <Link href="/service-areas">See coverage</Link>
          </Button>
        </div>
      </section>

      <section id="pricing" className="py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">Pricing preview</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground">
            Example figures — your quote depends on volume and how often we visit.{" "}
            <Link href="/pricing" className="font-medium text-foreground underline underline-offset-4">
              Full pricing
            </Link>
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border bg-card p-8 shadow-sm">
              <div className="text-sm font-semibold text-primary">Pay-as-you-go</div>
              <p className="mt-1 text-xs text-muted-foreground">From our standard per-knife guide rate (indicative).</p>
              <p className="mt-4 text-3xl font-semibold tabular-nums tracking-tight">
                From {formatGBP(paygFromMinor)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">Per knife · confirm on quote</p>
              <ul className="mt-4 space-y-2 border-t pt-4 text-sm text-muted-foreground">
                {PRICING.tiers.map((t) => (
                  <li key={t.id}>
                    <span className="text-foreground">{t.label}</span> — {formatGBP(t.unitAmountMinor)} per knife
                    (guide)
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border bg-card p-8 shadow-sm">
              <div className="text-sm font-semibold text-primary">Regular programme</div>
              <p className="mt-1 text-xs text-muted-foreground">Example monthly bundle for scheduled visits (indicative).</p>
              <p className="mt-4 text-3xl font-semibold tabular-nums tracking-tight">{subscriptionDisplay}</p>
              <p className="mt-2 text-xs text-muted-foreground">per month · tailored when we speak</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t bg-gradient-to-b from-primary/10 to-background py-20 md:py-24">
        <div className="mx-auto max-w-2xl px-4 text-center md:px-8">
          <h2 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">Ready to sharpen your knives?</h2>
          <p className="mt-4 text-muted-foreground">
            Book a collection in a few minutes. We&apos;ll confirm timing and anything we need from you before we arrive.
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:justify-center">
            <Button size="lg" className="rounded-lg sm:min-w-[220px]" asChild>
              <Link href="/book">
                Book a collection
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-lg sm:min-w-[220px]" asChild>
              <Link href="/contact">Talk to us first</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
