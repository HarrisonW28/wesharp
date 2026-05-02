"use client";

import Link from "next/link";

import type { NavItem, NavSection } from "@/config/navigation";

import { WeSharpLogo } from "@/components/brand/WeSharpLogo";
import { SidebarNav } from "@/components/navigation/SidebarNav";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export type MobileNavQuickLink = {
  href: string;
  label: string;
};

type MobileDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items?: NavItem[];
  sections?: NavSection[];
  /** Shown next to the logo (e.g. "Ops" for admin). */
  brandSuffix?: string;
  /** Wordmark link target (marketing `/` for customers, `/admin/dashboard` for ops). */
  logoHref?: string;
  /** Primary home link at top of drawer (Sprint 13.1). */
  quickLinks?: MobileNavQuickLink[];
};

export function MobileDrawer({
  open,
  onOpenChange,
  items,
  sections,
  brandSuffix,
  logoHref,
  quickLinks,
}: MobileDrawerProps) {
  const sheetLabel = brandSuffix ? `WeSharp ${brandSuffix}` : "WeSharp";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[min(92vw,20rem)] p-0">
        <SheetHeader className="border-b px-4 py-4 text-left">
          <SheetTitle className="text-lg font-normal leading-none">
            <span className="sr-only">{sheetLabel}</span>
            <span className="inline-flex items-center gap-2">
              <WeSharpLogo
                className="h-9 md:h-8"
                href={logoHref}
                onNavigate={logoHref ? () => onOpenChange(false) : undefined}
              />
              {brandSuffix ? <span className="text-xs font-medium text-muted-foreground">{brandSuffix}</span> : null}
            </span>
          </SheetTitle>
        </SheetHeader>
        {quickLinks !== undefined && quickLinks.length > 0 ? (
          <div className="flex flex-col gap-px border-b bg-muted/40">
            {quickLinks.map((q) => (
              <Link
                key={q.href}
                href={q.href}
                onClick={() => onOpenChange(false)}
                className="px-4 py-2.5 text-sm font-medium text-primary hover:bg-muted/60"
              >
                {q.label}
              </Link>
            ))}
          </div>
        ) : null}
        <SidebarNav items={items} sections={sections} onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
