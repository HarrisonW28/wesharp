import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { MarketingArticle } from "@/components/marketing/MarketingArticle";
import { ServiceAreaCheckerSection } from "@/components/marketing/ServiceAreaCheckerSection";
import { SERVICE_AREAS, getServiceAreaBySlug, serviceAreaSlugs } from "@/config/service-areas";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return serviceAreaSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const area = getServiceAreaBySlug(slug);
  if (!area) {
    return { title: "Areas we cover" };
  }
  const title = `Knife sharpening in ${area.seoCity}`;
  const canonicalPath = `/service-areas/${area.slug}`;
  return {
    title,
    description: area.metaDescription,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: `WeSharp — ${title}`,
      description: area.metaDescription,
      type: "website",
    },
  };
}

export default async function ServiceAreaLocalPage({ params }: Props) {
  const { slug } = await params;
  const area = getServiceAreaBySlug(slug);
  if (!area) {
    notFound();
  }

  const others = SERVICE_AREAS.filter((a) => a.slug !== area.slug);

  return (
    <MarketingArticle
      title={`Knife sharpening in ${area.seoCity}`}
      lead={area.lead}
    >
      {area.paragraphs.map((text, i) => (
        <p key={i}>{text}</p>
      ))}
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
      {others.length > 0 ? (
        <section className="rounded-xl border bg-card p-4 md:p-5">
          <h2 className="text-base font-semibold text-foreground">Other areas we cover</h2>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-muted-foreground md:text-base">
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={`/service-areas/${o.slug}`} className="font-medium text-primary underline-offset-4 hover:underline">
                  Knife sharpening in {o.seoCity}
                </Link>
                <span className="text-muted-foreground"> — {o.label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm">
            <Link href="/service-areas" className="font-medium text-primary underline-offset-4 hover:underline">
              All service areas and postcode checker
            </Link>
          </p>
        </section>
      ) : null}
    </MarketingArticle>
  );
}
