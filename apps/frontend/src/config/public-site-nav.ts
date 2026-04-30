export type PublicSiteLink = {
  href: string;
  label: string;
};

/** Top-level marketing routes (shown in header + mobile sheet). */
export const PUBLIC_SITE_NAV_LINKS: PublicSiteLink[] = [
  { href: "/services", label: "Services" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/service-areas", label: "Areas we cover" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];
