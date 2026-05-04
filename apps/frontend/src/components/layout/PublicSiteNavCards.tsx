"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CircleHelp,
  LayoutList,
  Mail,
  MapPin,
  Repeat,
  Shield,
  Sparkles,
  Tag,
} from "lucide-react";

import type { PublicSiteLink } from "@/config/public-site-nav";
import { PUBLIC_SITE_NAV_SECTIONS } from "@/config/public-site-nav";

import { cn } from "@/lib/utils";

const NAV_CARD_ICONS: Record<string, LucideIcon> = {
  "/services": Sparkles,
  "/pricing": Tag,
  "/subscriptions": Repeat,
  "/how-it-works": LayoutList,
  "/trade-accounts": Building2,
  "/service-areas": MapPin,
  "/faq": CircleHelp,
  "/contact": Mail,
  "/safety": Shield,
};

function NavCard({
  link,
  onNavigate,
}: {
  link: PublicSiteLink;
  onNavigate?: () => void;
}) {
  const Icon = NAV_CARD_ICONS[link.href] ?? Sparkles;
  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      className={cn(
        "group flex gap-3 rounded-xl border border-border/80 bg-card p-4 text-left shadow-sm outline-none transition-colors",
        "hover:border-primary/30 hover:bg-accent/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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

type PublicSiteNavSectionsCardsProps = {
  /** Sheet: single column. Menu: two columns from sm up (dashboard-style grid). */
  layout: "menu" | "sheet";
  onNavigate?: () => void;
  className?: string;
};

/** Grouped card grids — matches customer dashboard card density and icon treatment. */
export function PublicSiteNavSectionsCards({ layout, onNavigate, className }: PublicSiteNavSectionsCardsProps) {
  const gridClass = layout === "menu" ? "grid grid-cols-1 gap-3 sm:grid-cols-2" : "grid grid-cols-1 gap-3";

  return (
    <div className={cn("space-y-6", className)}>
      {PUBLIC_SITE_NAV_SECTIONS.map((section) => (
        <div key={section.label}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.label}</p>
          <div className={gridClass}>
            {section.links.map((link) => (
              <NavCard key={link.href} link={link} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
