export type PublicSiteLink = {
  href: string;
  label: string;
  /** One line under the title — dashboard card style. */
  description: string;
};

export type PublicSiteNavSection = {
  label: string;
  links: PublicSiteLink[];
};

/**
 * Marketing IA — grouped for header panel + mobile sheet. Flat list derived below for
 * any code that needs a single array.
 */
export const PUBLIC_SITE_NAV_SECTIONS: PublicSiteNavSection[] = [
  {
    label: "Services & bookings",
    links: [
      {
        href: "/services",
        label: "Services",
        description: "What we sharpen and how collections work.",
      },
      {
        href: "/pricing",
        label: "Pricing",
        description: "Guide prices and what affects your quote.",
      },
      {
        href: "/subscriptions",
        label: "Subscriptions",
        description: "Rolling programmes and allowances.",
      },
      {
        href: "/how-it-works",
        label: "How it works",
        description: "From booking to doorstep return.",
      },
    ],
  },
  {
    label: "Business",
    links: [
      {
        href: "/trade-accounts",
        label: "For business",
        description: "Multi-site, routes, and consolidated billing.",
      },
    ],
  },
  {
    label: "Coverage & help",
    links: [
      {
        href: "/service-areas",
        label: "Areas we cover",
        description: "Check your postcode and regions we serve.",
      },
      {
        href: "/faq",
        label: "FAQ",
        description: "Common questions answered.",
      },
      {
        href: "/contact",
        label: "Contact",
        description: "Talk to the team about a visit or account.",
      },
      {
        href: "/safety",
        label: "Safety",
        description: "Handling, packaging, and workshop care.",
      },
    ],
  },
];

/** All header targets in one list (order follows sections). */
export const PUBLIC_SITE_NAV_LINKS: PublicSiteLink[] = PUBLIC_SITE_NAV_SECTIONS.flatMap((s) => s.links);
