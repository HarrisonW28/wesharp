"use client";

import Link from "next/link";

import type { ReactNode } from "react";

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
  /** Optional block directly under the logo row (e.g. tenant profile on mobile). */
  leadContent?: ReactNode;
};

export function MobileDrawer({
  open,
  onOpenChange,
  items,
  sections,
  brandSuffix,
  logoHref,
  quickLinks,
  leadContent,
}: MobileDrawerProps) {
  const sheetLabel = brandSuffix ? `WeSharp ${brandSuffix}` : "WeSharp";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="flex h-full max-h-[100dvh] w-[min(92vw,20rem)] flex-col gap-0 overflow-hidden p-0"
      >
        <SheetHeader className="shrink-0 space-y-0 border-b px-4 py-3 text-left">
          <SheetTitle className="text-lg font-normal leading-none">
            <span className="sr-only">{sheetLabel}</span>
            <span className="inline-flex items-center gap-2">
              <WeSharpLogo
                className="h-8 md:h-8"
                href={logoHref}
                onNavigate={logoHref ? () => onOpenChange(false) : undefined}
              />
              {brandSuffix ? <span className="text-xs font-medium text-muted-foreground">{brandSuffix}</span> : null}
            </span>
          </SheetTitle>
        </SheetHeader>
        {leadContent}
        {quickLinks !== undefined && quickLinks.length > 0 ? (
          <div className="shrink-0 flex flex-col gap-px border-b bg-muted/40">
            {quickLinks.map((q) => (
              <Link
                key={q.href}
                href={q.href}
                onClick={() => onOpenChange(false)}
                className="inline-flex min-h-11 touch-manipulation items-center px-4 py-3 text-sm font-medium text-primary hover:bg-muted/60 active:bg-muted/80"
              >
                {q.label}
              </Link>
            ))}
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
          <SidebarNav items={items} sections={sections} onNavigate={() => onOpenChange(false)} className="px-0 pb-4" />
        </div>
      </SheetContent>
    </Sheet>
  );
}
