import type { Metadata } from "next";
import Link from "next/link";

import { MarketingArticle } from "@/components/marketing/MarketingArticle";
import {
  PortalKnifeRegisterMarketingPreview,
} from "@/components/marketing/MarketingPortalPreviews";
import { PortalFeaturesBand } from "@/components/marketing/PortalFeaturesBand";

export const metadata: Metadata = {
  title: "Knife register & blade history",
  description:
    "Tag every blade, track condition over time, and audit knives across sites — your live kit list inside the WeSharp customer portal.",
  openGraph: {
    title: "WeSharp — Knife register & blade history",
    description:
      "A living inventory of every blade we look after for you: tags, photos, inspections, and history per site.",
    type: "website",
  },
};

export default function TradeKnifeRegisterPage() {
  return (
    <MarketingArticle
      eyebrow="Portal features"
      title="Knife register & blade history"
      lead="A living inventory of every blade we look after — tagged, photographed, and tied to its own history across orders, inspections, and sites."
    >
      <PortalFeaturesBand variant="compact" currentKey="knife-register" />

      <div className="space-y-10">
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">One register, every blade</h2>
          <p>
            We tag the knives you want to track. From then on, each blade has its own row in your portal with type,
            label, last service, current site, and condition notes. Filters let you look at one site at a time, or roll
            everything up across the group.
          </p>
          <PortalKnifeRegisterMarketingPreview />
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Per-knife history that follows the blade</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="text-foreground">Every service</span> appears against the same knife — so you can see how
              often a blade has been sharpened in the last year, not just the last visit.
            </li>
            <li>
              <span className="text-foreground">Workshop inspections</span> are saved against the knife (edge geometry,
              tip condition, repair notes) so the next service starts where the last one left off.
            </li>
            <li>
              <span className="text-foreground">Photos over time</span> let you see how a particular knife is wearing —
              useful when deciding whether to retire a blade or invest in replacements.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Useful when paperwork would have failed</h2>
          <p>
            Multi-site groups already deal with a lot of kit moving around. The register is built for the things
            spreadsheets quietly get wrong:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="text-foreground">Audits</span> — quickly produce a list of every blade per kitchen with
              status and last service date.
            </li>
            <li>
              <span className="text-foreground">Insurance</span> — show condition photos and service history when a
              claim asks for proof of upkeep.
            </li>
            <li>
              <span className="text-foreground">Moves between sites</span> — when a blade transfers kitchens, its history
              follows it; no rebuilding a kit list from scratch.
            </li>
            <li>
              <span className="text-foreground">Retirement &amp; replacement</span> — clear evidence of how a blade is
              ageing, so head chef and finance agree on when to replace.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">What we replace</h2>
          <p>
            Most kitchens we onboard rely on a head-chef spreadsheet (or memory). That is fine until staff turn over.
            The portal&apos;s register removes the single-person dependency: the data lives with the account, not in a
            person&apos;s inbox.
          </p>
          <p className="text-sm text-muted-foreground">
            Not every customer wants per-blade tagging — for one-off pay-as-you-go visits we can simply track the batch.
            Tagging is opt-in on the account.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Linked to every other portal record</h2>
          <p>
            Inside the portal, each register entry links straight to the relevant order, collection, and invoice — so
            the &ldquo;why&rdquo; behind every change of state is one click away. See those areas in the{" "}
            <Link href="#portal-features" className="font-medium text-foreground underline underline-offset-4">
              feature cards
            </Link>{" "}
            at the top of the page.
          </p>
        </section>
      </div>
    </MarketingArticle>
  );
}
