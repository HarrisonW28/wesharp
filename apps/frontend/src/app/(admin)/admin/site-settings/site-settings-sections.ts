import type { LucideIcon } from "lucide-react";
import { BookOpen, HelpCircle, Home, Layers, Mail, MessageSquareText, Shield } from "lucide-react";

export const SITE_SETTINGS_BASE = "/admin/site-settings";

export type SiteSettingsSectionMeta = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export const SITE_SETTINGS_SECTIONS: SiteSettingsSectionMeta[] = [
  {
    href: `${SITE_SETTINGS_BASE}/homepage`,
    title: "Homepage",
    description: "Hero, trust row, how-it-works grid, audience, benefits, areas, pricing strip, and footer CTA.",
    icon: Home,
  },
  {
    href: `${SITE_SETTINGS_BASE}/services-pricing`,
    title: "Services & pricing pages",
    description: "Services landing copy and the standalone pricing page intro.",
    icon: Layers,
  },
  {
    href: `${SITE_SETTINGS_BASE}/how-it-works`,
    title: "How it works",
    description: "Standalone how-it-works page — steps, subscriptions prompt, and sign-in hints.",
    icon: BookOpen,
  },
  {
    href: `${SITE_SETTINGS_BASE}/faq`,
    title: "FAQ",
    description: "FAQ page title, lead, and question list.",
    icon: HelpCircle,
  },
  {
    href: `${SITE_SETTINGS_BASE}/safety`,
    title: "Safety & trust",
    description: "Public safety page — lead and trust bullets.",
    icon: Shield,
  },
  {
    href: `${SITE_SETTINGS_BASE}/contact`,
    title: "Contact & service areas",
    description: "Contact page, support details, and service areas copy.",
    icon: Mail,
  },
  {
    href: `${SITE_SETTINGS_BASE}/booking`,
    title: "Booking & notifications",
    description: "Public booking wizard copy, success screen, business hours, and email footer.",
    icon: MessageSquareText,
  },
];
