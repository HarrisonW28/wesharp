export type PublicSiteLink = {
  href: string;
  label: string;
};

export type PublicSiteNavSection = {
  label: string;
  links: PublicSiteLink[];
};

/**
 * Marketing IA — grouped for header dropdown + mobile sheet. Flat list derived below for
 * any code that needs a single array.
 */
export const PUBLIC_SITE_NAV_SECTIONS: PublicSiteNavSection[] = [
  {
    label: "Services & bookings",
    links: [
      { href: "/services", label: "Services" },
      { href: "/pricing", label: "Pricing" },
      { href: "/subscriptions", label: "Subscriptions" },
      { href: "/how-it-works", label: "How it works" },
    ],
  },
  {
    label: "Business",
    links: [{ href: "/trade-accounts", label: "For business" }],
  },
  {
    label: "Coverage & help",
    links: [
      { href: "/service-areas", label: "Areas we cover" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
      { href: "/safety", label: "Safety" },
    ],
  },
];

/** All header targets in one list (order follows sections). */
export const PUBLIC_SITE_NAV_LINKS: PublicSiteLink[] = PUBLIC_SITE_NAV_SECTIONS.flatMap((s) => s.links);
