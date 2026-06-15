import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { JsonLd } from "@/components/marketing/JsonLd";
import { MarketingArticle } from "@/components/marketing/MarketingArticle";
import { ServiceAreaCheckerSection } from "@/components/marketing/ServiceAreaCheckerSection";
import { Button } from "@/components/ui/button";
import {
  MANCHESTER_FAQS,
  MANCHESTER_H1,
  MANCHESTER_LEAD,
  MANCHESTER_META_DESCRIPTION,
  MANCHESTER_PAGE_TITLE,
  manchesterFaqSchema,
  manchesterLocalBusinessSchema,
} from "@/config/service-area-manchester-content";

export const metadata: Metadata = {
  title: MANCHESTER_PAGE_TITLE,
  description: MANCHESTER_META_DESCRIPTION,
  alternates: {
    canonical: "/service-areas/manchester",
  },
  openGraph: {
    title: `WeSharp — ${MANCHESTER_H1}`,
    description: MANCHESTER_META_DESCRIPTION,
    type: "website",
  },
};

export const revalidate = 60;

const sectionHeadingClass = "text-base font-semibold text-foreground";

export default function ManchesterServiceAreaPage() {
  return (
    <>
      <JsonLd data={manchesterFaqSchema(MANCHESTER_FAQS)} />
      <JsonLd data={manchesterLocalBusinessSchema()} />

      <MarketingArticle title={MANCHESTER_H1} lead={MANCHESTER_LEAD} showFooterCtas={false}>
        <p>
          If you have been searching for <strong className="font-medium text-foreground">knife sharpening near me Manchester</strong>,
          you do not need to carry blades across town or wait in a shop queue. WeSharp collects from your address on a scheduled
          round, sharpens every knife in our workshop, and returns them with a clear edge you can feel on the board. That is the
          same flow whether you cook at home or run a pass in the city centre.
        </p>
        <p>
          Professional sharpening does more than make cutting easier. A properly maintained bevel removes less steel over time than
          repeated passes on a blunt edge with a steel or pull-through sharpener. Knives stay thinner, truer, and in service for
          longer — which matters when you have invested in good steel or Japanese profiles. Our{" "}
          <Link href="/services" className="font-medium text-foreground underline underline-offset-4">
            knife sharpening service Manchester
          </Link>{" "}
          customers book online, get a written quote before work starts, and track progress in their account where their programme
          includes it.
        </p>
        <p>
          Manchester kitchens — domestic and professional — tend to run hard on their edges. Daily prep on boards and plates dulls
          even good steel faster than most people expect. Honing with a rod straightens the edge for a while, but it does not replace
          sharpening once the bevel has rounded or chipped. Sending knives to a workshop on a regular rhythm keeps them predictable:
          safer to use, faster on the pass, and less likely to need premature replacement.
        </p>

        <section className="space-y-4">
          <h2 className={sectionHeadingClass}>Professional Knife Sharpening Across Manchester</h2>
          <p>
            Coverage follows the postcode rules we use for booking — not just the council boundary — so{" "}
            <strong className="font-medium text-foreground">knife sharpening Greater Manchester</strong> means the postcodes we
            accept on our live checker, from the urban core to the surrounding boroughs.
          </p>
          <p>
            In <strong className="font-medium text-foreground">Manchester city centre</strong> we collect from apartments, serviced
            kitchens, and restaurant back-of-house with agreed time windows.{" "}
            <strong className="font-medium text-foreground">Salford</strong> and <strong className="font-medium text-foreground">Trafford</strong>{" "}
            see regular driver rounds through MediaCity, Old Trafford, and Stretford. South of the river,{" "}
            <strong className="font-medium text-foreground">Stockport</strong>,{" "}
            <strong className="font-medium text-foreground">Didsbury</strong>, and{" "}
            <strong className="font-medium text-foreground">Chorlton</strong> are well within our Greater Manchester routes.
          </p>
          <p>
            North and east, we serve <strong className="font-medium text-foreground">Bolton</strong>,{" "}
            <strong className="font-medium text-foreground">Bury</strong>,{" "}
            <strong className="font-medium text-foreground">Rochdale</strong>, and{" "}
            <strong className="font-medium text-foreground">Oldham</strong> on the same collection-and-return model. West toward{" "}
            <strong className="font-medium text-foreground">Altrincham</strong> and Hale, home cooks and independent restaurants
            book one-off visits or rolling programmes. Wherever you are, drop your postcode into the checker below before you{" "}
            <Link href="/book" className="font-medium text-foreground underline underline-offset-4">
              book a collection
            </Link>
            .
          </p>
          <p>
            Suburban streets in Chorlton and Didsbury, terrace kitchens in Levenshulme, and new-build flats around Ancoats all use
            the same booking flow: postcode check, collection window, bag handover at the door. We route drivers through Greater
            Manchester on scheduled rounds rather than ad-hoc trips, which keeps timing realistic and costs transparent.
          </p>
          <p>
            We also run the same service in Merseyside — see our{" "}
            <Link href="/service-areas/liverpool" className="font-medium text-foreground underline underline-offset-4">
              knife sharpening in Liverpool
            </Link>{" "}
            page if you have sites on both sides of the North West.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className={sectionHeadingClass}>Knives We Sharpen</h2>
          <p>
            Our workshop handles everyday kitchen blades and specialist profiles. If you are unsure whether a knife is suitable,
            mention it when you book — we will confirm before collection.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="font-medium text-foreground">Chef knives</strong> — gyutos, Western chef&apos;s knives, and
              workhorse blades from 20 cm upward, including{" "}
              <strong className="font-medium text-foreground">chef knife sharpening Manchester</strong> for brigades and home cooks.
            </li>
            <li>
              <strong className="font-medium text-foreground">Japanese knives</strong> — thinner steels and asymmetric grinds
              sharpened with care; we respect factory angles and established bevels on gyuto, santoku, and petty knives.
            </li>
            <li>
              <strong className="font-medium text-foreground">Santoku knives</strong> — the flat profile and granton edge need a
              steady hand; we restore the geometry without rounding the belly.
            </li>
            <li>
              <strong className="font-medium text-foreground">Paring knives</strong> — small blades that still need a clean,
              controlled edge for prep work.
            </li>
            <li>
              <strong className="font-medium text-foreground">Serrated knives</strong> — bread and tomato knives sharpened on the
              correct equipment so teeth stay even.
            </li>
            <li>
              <strong className="font-medium text-foreground">Hunting knives</strong> — field and butcher-style blades for game
              and outdoor use.
            </li>
            <li>
              <strong className="font-medium text-foreground">Pocket knives</strong> — folders and everyday carry, subject to safe
              handling on collection.
            </li>
          </ul>
          <p>
            <strong className="font-medium text-foreground">Japanese knife sharpening Manchester</strong> customers often ask about
            harder steels and thinner grinds. We treat those blades differently from thick German chef&apos;s knives — less
            aggressive removal, more attention to the existing geometry, and a conversation first if the edge has been neglected
            for years. Western stainless and carbon steel are straightforward; ceramic and very cheap stamped blades may not be
            worth workshop time — we will tell you honestly if that is the case.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className={sectionHeadingClass}>Knife Sharpening for Home Cooks</h2>
          <p>
            You do not need a restaurant-sized set to book. Many Manchester households send six to twelve knives once or twice a
            year — a chef&apos;s knife, a paring knife, a serrated loaf knife, and whatever else has gone dull in the block. We
            collect from your door, so you are not juggling blades on the tram or losing an afternoon in town.
          </p>
          <p>
            Before we sharpen, you see guide pricing on our{" "}
            <Link href="/pricing" className="font-medium text-foreground underline underline-offset-4">
              pricing page
            </Link>{" "}
            and receive a written quote when we confirm the booking. That keeps{" "}
            <strong className="font-medium text-foreground">professional knife sharpening Manchester</strong> straightforward:
            book a window, hand over a bag, and get knives back that slice tomatoes without pressure. If you sharpen often, a{" "}
            <Link href="/subscriptions" className="font-medium text-foreground underline underline-offset-4">
              regular programme
            </Link>{" "}
            can bundle visits and allowances so you are not rebooking from scratch each time.
          </p>
          <p>
            Many home cooks keep one good chef&apos;s knife and let the rest of the block go dull. That is workable until prep
            starts to feel like work. A single collection can reset the knives you actually reach for — often for less than the
            cost of replacing one mid-range blade. If you are not sure how many knives to send, count what you use in a normal
            week and add your serrated and paring knives; we quote on the actual count at confirmation.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className={sectionHeadingClass}>Knife Sharpening for Restaurants and Hospitality Businesses</h2>
          <p>
            <strong className="font-medium text-foreground">Restaurant knife sharpening Manchester</strong> is built around
            reliability: agreed collection windows, logged custody, and edges that hold through a busy service. We work with
            independent restaurants, hotel kitchens, catering companies, and professional chefs who cannot afford mystery gaps on
            the knife rack.
          </p>
          <p>
            Hotels with multiple outlets can align routes so finance sees predictable invoicing while each site tracks its own
            blades. Catering companies sending kit between events benefit from the same workshop quality without staff losing
            time to drop-offs. For groups and multi-site operators,{" "}
            <Link href="/trade-accounts" className="font-medium text-foreground underline underline-offset-4">
              trade accounts
            </Link>{" "}
            bring consolidated billing and portal visibility across venues.
          </p>
          <p>
            Every blade is logged on collection and matched to your order on return. Where your programme includes customer-visible
            evidence, timestamped photos can appear in your account — useful for HACCP-minded teams and site managers who want
            proof of work without chasing updates.
          </p>
          <p>
            Head chefs and sous chefs rarely have time to chase a sharpening shop during service. A fixed collection window — early
            morning or between lunch and dinner — means knives leave and return without the pass going short. For high-volume sites,
            rolling programmes spread cost across the month and keep edges on a cadence the brigade can plan around rather than
            reacting when someone notices a tomato being crushed instead of sliced.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className={sectionHeadingClass}>Our Sharpening Process</h2>
          <p>
            From first booking to blades back on the rack, the flow is the same for homes and hospitality. More detail lives on our{" "}
            <Link href="/how-it-works" className="font-medium text-foreground underline underline-offset-4">
              how it works
            </Link>{" "}
            page; here is what happens on a typical Manchester collection.
          </p>
          <ol className="list-decimal space-y-3 pl-5">
            <li>
              <strong className="font-medium text-foreground">Collection</strong> — you book a date and window. Our driver
              arrives, logs each knife, and takes them to the workshop in secure custody.
            </li>
            <li>
              <strong className="font-medium text-foreground">Inspection</strong> — we assess steel type, existing bevel, chips,
              and handle condition. Anything unusual is flagged before sharpening begins.
            </li>
            <li>
              <strong className="font-medium text-foreground">Sharpening</strong> — edges are restored on professional equipment,
              matching the angle already on the blade unless you have asked for a specific profile.
            </li>
            <li>
              <strong className="font-medium text-foreground">Polishing</strong> — burrs are removed and the edge is refined so
              it feels clean on the board, not toothy or rolled.
            </li>
            <li>
              <strong className="font-medium text-foreground">Quality check</strong> — each knife is inspected before it is
              packed for return. Nothing leaves without passing our workshop standard.
            </li>
            <li>
              <strong className="font-medium text-foreground">Return delivery</strong> — sharpened knives come back on a follow-up
              run, ready for service, with status visible in your account where tracking is enabled.
            </li>
          </ol>
        </section>

        <section className="space-y-4">
          <h2 className={sectionHeadingClass}>Why Manchester Customers Choose WeSharp</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="font-medium text-foreground">Convenience</strong> — true{" "}
              <strong className="font-medium text-foreground">mobile knife sharpening Manchester</strong>: collection and return
              at your address, not a shop queue or parcel faff.
            </li>
            <li>
              <strong className="font-medium text-foreground">Consistent results</strong> — workshop sharpening on every job, not
              a different result depending on who is on the counter.
            </li>
            <li>
              <strong className="font-medium text-foreground">Professional equipment</strong> — proper stones, guides, and
              inspection discipline for Western and Japanese profiles alike.
            </li>
            <li>
              <strong className="font-medium text-foreground">Collection and return service</strong> — logged handovers, clear
              quotes in GBP, and tracked orders from door to door.
            </li>
          </ul>
          <p>
            Whether you need a one-off reset or a route your brigade can rely on, the aim is the same: sharp knives back in your
            kitchen without disrupting service.
          </p>
          <p>
            We are not a high-street stall that sharpens while you wait, and we are not a postal service where knives disappear into
            a jiffy bag for days. WeSharp sits in the middle: local North West operation, workshop discipline, and a driver who
            knows your building or site access notes. That combination is why repeat bookings across Manchester outnumber one-off
            visits — once a kitchen has seen the difference on the board, blunt knives become something you fix on a schedule
            rather than tolerate.
          </p>
        </section>

        <Suspense
          fallback={
            <div
              className="h-56 animate-pulse rounded-xl border bg-muted/30"
              aria-busy="true"
              aria-label="Loading postcode checker"
            />
          }
        >
          <ServiceAreaCheckerSection className="rounded-xl border bg-muted/20 p-4 md:p-5" />
        </Suspense>

        <section className="space-y-4">
          <h2 className={sectionHeadingClass}>Frequently Asked Questions</h2>
          <dl className="space-y-4">
            {MANCHESTER_FAQS.map(({ q, a }) => (
              <div key={q} className="rounded-xl border bg-card px-5 py-4">
                <dt className="text-base font-medium text-foreground">{q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">{a}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm">
            More general answers live on our{" "}
            <Link href="/faq" className="font-medium text-foreground underline underline-offset-4">
              FAQ page
            </Link>
            .
          </p>
        </section>

        <section className="space-y-4 rounded-2xl border bg-muted/25 p-5 md:p-6">
          <h2 className="text-lg font-semibold text-foreground">Book Knife Sharpening in Manchester</h2>
          <p>
            Ready to stop fighting blunt blades? Check your postcode, see guide pricing, and book a collection in a few minutes.
            We confirm your window and quote before any sharpening begins — no surprises, no guesswork.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button className="rounded-lg" asChild>
              <Link href="/book">Book a collection</Link>
            </Button>
            <Button variant="outline" className="rounded-lg" asChild>
              <Link href="/pricing">View pricing</Link>
            </Button>
            <Button variant="outline" className="rounded-lg" asChild>
              <Link href="/contact">Ask a question</Link>
            </Button>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4 md:p-5">
          <h2 className={sectionHeadingClass}>Other areas we cover</h2>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-muted-foreground md:text-base">
            <li>
              <Link href="/service-areas/liverpool" className="font-medium text-primary underline-offset-4 hover:underline">
                Knife sharpening in Liverpool
              </Link>
              <span className="text-muted-foreground"> — Liverpool City Region</span>
            </li>
          </ul>
          <p className="mt-3 text-sm">
            <Link href="/service-areas" className="font-medium text-primary underline-offset-4 hover:underline">
              All service areas and postcode checker
            </Link>
          </p>
        </section>
      </MarketingArticle>
    </>
  );
}
