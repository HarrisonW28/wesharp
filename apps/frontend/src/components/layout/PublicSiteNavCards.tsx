"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Building2,
  CalendarClock,
  CircleHelp,
  ClipboardList,
  LayoutList,
  Mail,
  MapPin,
  Package,
  Receipt,
  Repeat,
  Shield,
  Sparkles,
  Tag,
} from "lucide-react";

import type { PublicSiteLink, PublicSiteNavSection } from "@/config/public-site-nav";
import { PUBLIC_SITE_NAV_SECTIONS } from "@/config/public-site-nav";

import { cn } from "@/lib/utils";

const NAV_CARD_ICONS: Record<string, LucideIcon> = {
  "/services": Sparkles,
  "/pricing": Tag,
  "/subscriptions": Repeat,
  "/how-it-works": LayoutList,
  "/trade-accounts": Building2,
  "/trade-accounts/reporting": BarChart3,
  "/trade-accounts/order-tracking": Package,
  "/trade-accounts/knife-register": ClipboardList,
  "/trade-accounts/collections": CalendarClock,
  "/trade-accounts/invoicing": Receipt,
  "/service-areas": MapPin,
  "/faq": CircleHelp,
  "/contact": Mail,
  "/safety": Shield,
};

function iconForPublicNavHref(href: string): LucideIcon {
  const path = href.split("?")[0] ?? href;
  return NAV_CARD_ICONS[path] ?? Sparkles;
}

function NavCard({
  link,
  onNavigate,
  menuRow,
}: {
  link: PublicSiteLink;
  onNavigate?: () => void;
  /** Desktop mega-menu: equal-width tiles on one row. */
  menuRow?: boolean;
}) {
  const Icon = iconForPublicNavHref(link.href);
  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      className={cn(
        "group flex gap-3 rounded-xl border border-border/80 bg-card p-4 text-left shadow-sm outline-none transition-colors",
        "hover:border-primary/30 hover:bg-accent/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        menuRow && "min-h-full min-w-0 w-full max-w-none",
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-snug text-foreground">{link.label}</span>
        <span className="mt-1 block text-xs leading-snug text-muted-foreground">{link.description}</span>
      </span>
    </Link>
  );
}

type LayoutMode = "menu" | "sheet";

function sectionCardsClass(layout: LayoutMode): string {
  return layout === "menu"
    ? /** Four columns so each card has a fixed “quarter row” width even when a section has fewer links. */
      "grid grid-cols-4 gap-3"
    : "grid grid-cols-1 gap-3 sm:grid-cols-2";
}

/** Card links for one IA section (parent label lives on the menu trigger or sheet heading). */
export function PublicSiteNavSectionCards({
  section,
  layout,
  onNavigate,
  className,
}: {
  section: PublicSiteNavSection;
  layout: LayoutMode;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <div className={cn(sectionCardsClass(layout), className)}>
      {section.links.map((link) => (
        <NavCard key={link.href} link={link} onNavigate={onNavigate} menuRow={layout === "menu"} />
      ))}
    </div>
  );
}

type PublicSiteNavSectionsCardsProps = {
  layout: LayoutMode;
  onNavigate?: () => void;
  className?: string;
};

/** Mobile / full list: each parent heading then its card grid. */
export function PublicSiteNavSectionsCards({ layout, onNavigate, className }: PublicSiteNavSectionsCardsProps) {
  return (
    <div className={cn("flex flex-col gap-8", className)}>
      {PUBLIC_SITE_NAV_SECTIONS.map((section) => (
        <section key={section.label} aria-label={section.label}>
          <h2 className="mb-3 text-sm font-semibold leading-tight text-foreground">{section.label}</h2>
          <PublicSiteNavSectionCards section={section} layout={layout} onNavigate={onNavigate} />
        </section>
      ))}
    </div>
  );
}
