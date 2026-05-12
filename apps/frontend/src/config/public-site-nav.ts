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
      {
        href: "/trade-accounts/reporting",
        label: "Reporting & dashboards",
        description: "Portal overview, orders, knives, invoices, and subscription usage.",
      },
      {
        href: "/contact?topic=trade",
        label: "Multi-site enquiries",
        description: "Coverage, consolidated billing, and onboarding.",
      },
    ],
  },
  {
    label: "Portal features",
    links: [
      {
        href: "/trade-accounts/order-tracking",
        label: "Order tracking",
        description: "Live workshop status, photos at each stage, and inspections.",
      },
      {
        href: "/trade-accounts/knife-register",
        label: "Knife register",
        description: "Tagged blades, per-knife history, and multi-site audits.",
      },
      {
        href: "/trade-accounts/collections",
        label: "Bookings & collections",
        description: "Recurring slots, time windows, and self-service amendments.",
      },
      {
        href: "/trade-accounts/invoicing",
        label: "Invoicing & finance",
        description: "Consolidated billing, statuses, and VAT-ready exports.",
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

/** Stable id for desktop mega-menu triggers (a11y + aria-controls). */
export function publicSiteNavTriggerId(sectionLabel: string): string {
  return `public-nav-trigger-${sectionLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}
