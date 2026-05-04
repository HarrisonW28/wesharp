import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { HomeHero } from "@/components/marketing/HomeHero";
import { HomeHowStepsGrid } from "@/components/marketing/HomeHowStepsGrid";
import { PublicSubscriptionPlansCatalog } from "@/components/marketing/PublicSubscriptionPlansCatalog";
import { ServiceAreaCheckerSection } from "@/components/marketing/ServiceAreaCheckerSection";
import { Button } from "@/components/ui/button";
import { PRICING } from "@/config/pricing";
import { SERVICE_AREAS } from "@/config/service-areas";
import { formatGBP } from "@/lib/format/money";
import { PUBLIC_SITE_CONTENT_CONTAINER_CLASS } from "@/lib/public-site-layout";
import { fetchPublicSiteData } from "@/lib/site-content/fetch-site-content";

export const metadata: Metadata = {
  title: "Professional knife sharpening | WeSharp",
  description:
    "Doorstep collection and return for Greater Manchester & Liverpool. Book online, track your order, and get blades back workshop-sharp.",
  openGraph: {
    title: "WeSharp — Professional knife sharpening",
    description:
      "Book knife sharpening with collection from your kitchen. Serving Greater Manchester & Liverpool.",
    type: "website",
  },
};

export const revalidate = 60;

export default async function HomePage() {
  const { content: site } = await fetchPublicSiteData();
  const h = site.homepage;
  const paygFromMinor = Math.min(...PRICING.tiers.map((t) => t.unitAmountMinor));

  return (
    <>
      <HomeHero homepage={h} />

      <section id="check-coverage" className="scroll-mt-20 border-b bg-muted/20 py-14 md:py-20">
        <div className={PUBLIC_SITE_CONTENT_CONTAINER_CLASS}>
          <div className="mx-auto max-w-2xl text-center md:mx-0 md:max-w-xl md:text-left">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{h.areas_section_title}</h2>
            <p className="mt-3 text-sm text-muted-foreground md:text-base">{h.areas_section_lead}</p>
          </div>
          <div className="mt-8 md:mt-10">
            <ServiceAreaCheckerSection />
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-2 md:justify-start">
            {SERVICE_AREAS.map((area) => (
              <span
                key={area.id}
                className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground md:text-sm"
              >
                {area.label}
              </span>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground md:text-left">
            The checker above is the live result for your postcode. Labels are a quick regional guide only.
          </p>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20 border-b bg-background py-16 md:py-20">
        <div className={PUBLIC_SITE_CONTENT_CONTAINER_CLASS}>
          <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">{h.how_section_title}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground md:text-base">
            {h.how_section_lead}
          </p>
          <HomeHowStepsGrid
            steps={h.how_steps ?? []}
            moreLabel={h.how_section_more_label}
            moreHref="/how-it-works"
          />
        </div>
      </section>

      <section className="bg-muted/30 py-16 md:py-20">
        <div className={PUBLIC_SITE_CONTENT_CONTAINER_CLASS}>
          <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">{h.who_for_title}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground md:text-base">
            {h.who_for_lead}
          </p>
          <ul className="mt-10 flex flex-wrap justify-center gap-3">
            {(h.who_for_labels ?? []).map((label) => (
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

      <section className="border-b bg-background py-16 md:py-20">
        <div className={PUBLIC_SITE_CONTENT_CONTAINER_CLASS}>
          <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">Pick your path</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground md:text-base">
            One-off visits, rolling programmes, or multi-site accounts — the same workshop quality and tracking.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div className="flex flex-col rounded-2xl border bg-card p-8 shadow-sm">
              <h3 className="text-lg font-semibold">Home cooks &amp; single kitchens</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                Book when you need us. See guide pricing first, then a written quote before any work — no surprises.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:flex-wrap">
                <Button className="rounded-lg" asChild>
                  <Link href="/book">Book a collection</Link>
                </Button>
                <Button variant="outline" className="rounded-lg" asChild>
                  <Link href="/pricing">View pricing</Link>
                </Button>
              </div>
            </div>
            <div className="flex flex-col rounded-2xl border bg-card p-8 shadow-sm ring-1 ring-primary/15">
              <h3 className="text-lg font-semibold">Business &amp; hospitality</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                Routes your brigades can rely on, programmes with allowances, and consolidated billing across sites.
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button className="rounded-lg" asChild>
                  <Link href="/trade-accounts">Trade accounts</Link>
                </Button>
                <Button variant="outline" className="rounded-lg" asChild>
                  <Link href="/subscriptions">Programmes</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b py-16 md:py-20">
        <div className={PUBLIC_SITE_CONTENT_CONTAINER_CLASS}>
          <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">{h.benefits_title}</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(h.benefits ?? []).map(({ title, body }) => (
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

      <section id="pricing" className="py-16 md:py-20">
        <div className={PUBLIC_SITE_CONTENT_CONTAINER_CLASS}>
          <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">{h.pricing_section_title}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground">
            {h.pricing_section_lead}{" "}
            <Link href="/pricing" className="font-medium text-foreground underline underline-offset-4">
              Full pricing
            </Link>
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border bg-card p-8 shadow-sm">
              <div className="text-sm font-semibold text-primary">{h.pricing_section_payg_label}</div>
              <p className="mt-1 text-xs text-muted-foreground">{h.pricing_section_payg_hint}</p>
              <p className="mt-4 text-3xl font-semibold tabular-nums tracking-tight">From {formatGBP(paygFromMinor)}</p>
              <p className="mt-2 text-xs text-muted-foreground">{h.pricing_section_payg_footer}</p>
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
              <div className="text-sm font-semibold text-primary">{h.pricing_section_programme_label}</div>
              <p className="mt-1 text-xs text-muted-foreground">{h.pricing_section_programme_hint}</p>
              <PublicSubscriptionPlansCatalog footer={h.pricing_section_programme_footer} />
            </div>
          </div>
          <div className="mx-auto mt-8 grid max-w-md grid-cols-2 gap-3 sm:max-w-none sm:flex sm:flex-wrap sm:justify-center">
            <Button variant="outline" className="rounded-lg" asChild>
              <Link href="/subscriptions">{h.pricing_cta_subscriptions}</Link>
            </Button>
            <Button variant="ghost" className="rounded-lg" asChild>
              <Link href="/trade-accounts">{h.pricing_cta_trade}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t bg-gradient-to-b from-primary/10 to-background py-20 md:py-24">
        <div className={PUBLIC_SITE_CONTENT_CONTAINER_CLASS}>
          <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">{h.footer_cta_title}</h2>
          <p className="mt-4 text-muted-foreground">{h.footer_cta_lead}</p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:flex sm:flex-row sm:flex-wrap sm:justify-center">
            <Button size="lg" className="rounded-lg sm:min-w-[220px]" asChild>
              <Link href="/book">
                {h.footer_cta_book}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-lg sm:min-w-[220px]" asChild>
              <Link href="/contact">{h.footer_cta_talk}</Link>
            </Button>
            <Button size="lg" variant="secondary" className="col-span-2 rounded-lg sm:col-span-1 sm:min-w-[220px]" asChild>
              <Link href="/register">{h.footer_cta_register}</Link>
            </Button>
          </div>
        </div>
        </div>
      </section>
    </>
  );
}
