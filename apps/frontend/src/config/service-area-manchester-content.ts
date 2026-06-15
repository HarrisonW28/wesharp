import { publicSiteOrigin } from "@/lib/public-site-url";

export const MANCHESTER_PAGE_TITLE = "Knife Sharpening Manchester | WeSharp";

export const MANCHESTER_META_DESCRIPTION =
  "Professional knife sharpening Manchester with doorstep collection. Chef & Japanese knives sharpened in our workshop and returned to your door. Book online.";

export const MANCHESTER_H1 = "Knife Sharpening Manchester";

export const MANCHESTER_LEAD =
  "WeSharp runs a mobile knife sharpening Manchester service: we collect blunt blades from your door, sharpen them in our workshop, and deliver them back ready for service — for home kitchens and hospitality teams across Greater Manchester.";

export type ManchesterFaq = { q: string; a: string };

export const MANCHESTER_FAQS: ManchesterFaq[] = [
  {
    q: "How much does knife sharpening cost in Manchester?",
    a: "Pay-as-you-go sharpening starts from our published per-knife guide rate — use the pricing calculator for a live estimate based on your postcode and knife count. You receive a written quote before any work begins, so there are no surprises on collection day. Rolling programmes bundle visits and allowances for kitchens that sharpen regularly.",
  },
  {
    q: "How long does sharpening take?",
    a: "Turnaround depends on route volume and how many knives you send. When we confirm your booking we give you a realistic return date — most Manchester collections are sharpened, inspected, and back on your doorstep within a few working days. Express options may be available; ask when you book if timing is tight.",
  },
  {
    q: "Do you sharpen Japanese knives?",
    a: "Yes. We sharpen Japanese knives including gyuto, nakiri, and petty blades, respecting factory or established bevel angles and thinner profiles. Tell us the steel and any maker notes when you book so we can plan the right approach.",
  },
  {
    q: "Do you collect from my home?",
    a: "Yes. Our mobile knife sharpening Manchester service includes doorstep collection and tracked return. You choose a time window, hand over your knives in a bag at the door, and we bring them back once they have passed inspection.",
  },
  {
    q: "Do you sharpen restaurant knives?",
    a: "Restaurant knife sharpening Manchester is a core part of what we do. We work with independent sites, hotel kitchens, and catering companies on one-off resets and rolling programmes. Each blade is logged so nothing goes missing between collection and return.",
  },
  {
    q: "How often should knives be sharpened?",
    a: "Busy professional kitchens often benefit from a refresh every four to eight weeks, depending on volume and what you cut. Home cooks typically book two or three times a year. A sharp edge should slice cleanly without tearing — if you are forcing the blade, it is time.",
  },
  {
    q: "Can damaged knives be repaired?",
    a: "Minor chips, rolled edges, and neglected bevels can often be corrected in the workshop. Severe damage — deep nicks, bent tips, or cracked handles — may need a conversation first. Send photos with your enquiry if you are unsure.",
  },
  {
    q: "Which Manchester areas do you cover?",
    a: "We cover Greater Manchester postcodes we accept for online booking, including Manchester city centre, Salford, Trafford, Stockport, Bolton, Bury, Rochdale, Oldham, Altrincham, Didsbury, and Chorlton. Drop your postcode into the checker on this page to confirm eligibility.",
  },
  {
    q: "What angle do you sharpen knives to?",
    a: "We match the angle already on the blade unless you ask for something different. Western chef knives are commonly sharpened around 15–20 degrees per side; many Japanese knives are thinner. We inspect each knife on arrival and agree the right approach before sharpening.",
  },
  {
    q: "Why use a professional sharpening service?",
    a: "Professional equipment, consistent technique, and proper inspection extend knife life and keep edges safer to use. DIY rods and pull-through sharpeners can round bevels over time. A workshop service restores geometry, polishes the edge, and returns blades ready for real kitchen work.",
  },
];

/** Suggested internal anchor text for editors linking into this page from elsewhere. */
export const MANCHESTER_INTERNAL_LINK_SUGGESTIONS = [
  { href: "/service-areas/liverpool", anchor: "knife sharpening in Liverpool" },
  { href: "/pricing", anchor: "knife sharpening prices in Manchester" },
  { href: "/book", anchor: "book knife sharpening in Manchester" },
  { href: "/services", anchor: "professional knife sharpening service" },
  { href: "/how-it-works", anchor: "how our collection and return works" },
  { href: "/subscriptions", anchor: "regular sharpening programmes" },
  { href: "/trade-accounts", anchor: "restaurant knife sharpening accounts" },
  { href: "/service-areas", anchor: "check Greater Manchester coverage" },
] as const;

export function manchesterFaqSchema(faqs: ManchesterFaq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: {
        "@type": "Answer",
        text: a,
      },
    })),
  };
}

export function manchesterLocalBusinessSchema() {
  const origin = publicSiteOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${origin}/#organization`,
    name: "WeSharp",
    url: origin,
    description:
      "Professional knife sharpening with doorstep collection and return across Greater Manchester. Chef knives, Japanese blades, and hospitality programmes.",
    areaServed: [
      { "@type": "City", name: "Manchester" },
      { "@type": "AdministrativeArea", name: "Greater Manchester" },
      { "@type": "City", name: "Salford" },
      { "@type": "City", name: "Stockport" },
      { "@type": "City", name: "Bolton" },
    ],
    serviceArea: {
      "@type": "GeoCircle",
      geoMidpoint: {
        "@type": "GeoCoordinates",
        latitude: 53.4808,
        longitude: -2.2426,
      },
      geoRadius: "25000",
    },
    knowsAbout: [
      "knife sharpening",
      "chef knife sharpening",
      "Japanese knife sharpening",
      "restaurant knife sharpening",
      "mobile knife sharpening",
    ],
    priceRange: "££",
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Knife sharpening services",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Knife sharpening Manchester",
            description: "Doorstep collection, workshop sharpening, and return delivery across Greater Manchester.",
            areaServed: "Greater Manchester",
          },
        },
      ],
    },
  };
}
