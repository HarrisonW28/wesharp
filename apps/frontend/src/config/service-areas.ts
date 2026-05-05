export type ServiceArea = {
  id: string;
  /** URL segment, e.g. `/service-areas/manchester` */
  slug: string;
  label: string;
  region: string;
  /** Headline place name, e.g. "Manchester" for "Knife sharpening in Manchester" */
  seoCity: string;
  metaDescription: string;
  lead: string;
  paragraphs: readonly string[];
};

/** Markets referenced in marketing copy — pricing/geo rules live backend-side later */
export const SERVICE_AREAS: ServiceArea[] = [
  {
    id: "manchester",
    slug: "manchester",
    label: "Greater Manchester",
    region: "England",
    seoCity: "Manchester",
    metaDescription:
      "Book professional knife sharpening in Greater Manchester. Doorstep collection, workshop sharpening and tracked return — covering Manchester, Salford, Stockport and surrounding postcodes.",
    lead:
      "WeSharp collects blunt knives from homes and hospitality kitchens across Greater Manchester, sharpens them in our workshop, and brings them back ready for service.",
    paragraphs: [
      "If you are in the city centre, Trafford, Oldham, Rochdale, Bolton, Bury or nearby towns, you can choose a collection window and hand your blades to our driver at the door. The same flow applies to rolling programmes and one-off visits — you always get a clear quote before we sharpen.",
      "Coverage follows the postcode rules we use for booking, not just the council boundary. Drop your postcode into the checker on this page to confirm your address is in zone before you book.",
      "When you are ready, head to our booking flow to pick a slot, or read how collections and returns work on the how it works page.",
    ],
  },
  {
    id: "liverpool",
    slug: "liverpool",
    label: "Liverpool City Region",
    region: "England",
    seoCity: "Liverpool",
    metaDescription:
      "Book professional knife sharpening in Liverpool and the wider city region. Home and business collections, workshop edges, and tracked return across Merseyside postcodes we serve.",
    lead:
      "From Liverpool itself to Wirral, Knowsley, Sefton and St Helens, we offer the same doorstep collection and return service that WeSharp runs across the North West.",
    paragraphs: [
      "Kitchen teams and home cooks on both sides of the Mersey can book a collection instead of carrying knives into town. We route drivers through the Liverpool City Region on scheduled rounds — typical use is a bag handover at the door, then tracked return once knives are sharpened and inspected.",
      "As with every area we publish, eligibility is postcode-based. Use the live checker below to see if your property is inside the zone we currently accept for online booking.",
      "Compare programme options on subscriptions or start with a single collection from the book page when your knives need a reset.",
    ],
  },
];

export function getServiceAreaBySlug(slug: string): ServiceArea | undefined {
  return SERVICE_AREAS.find((a) => a.slug === slug);
}

export function serviceAreaSlugs(): string[] {
  return SERVICE_AREAS.map((a) => a.slug);
}
