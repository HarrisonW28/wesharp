"use client";

import type { NavItem } from "@/config/navigation";

import { WeSharpLogo } from "@/components/brand/WeSharpLogo";
import { SidebarNav } from "@/components/navigation/SidebarNav";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type MobileDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: NavItem[];
  /** Shown next to the logo (e.g. "Ops" for admin). */
  brandSuffix?: string;
};

export function MobileDrawer({ open, onOpenChange, items, brandSuffix }: MobileDrawerProps) {
  const sheetLabel = brandSuffix ? `WeSharp ${brandSuffix}` : "WeSharp";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[min(92vw,20rem)] p-0">
        <SheetHeader className="border-b px-4 py-3 text-left">
          <SheetTitle className="text-lg font-normal leading-none">
            <span className="sr-only">{sheetLabel}</span>
            <span className="inline-flex items-center gap-2" aria-hidden>
              <WeSharpLogo className="h-8" />
              {brandSuffix ? <span className="text-xs font-medium text-muted-foreground">{brandSuffix}</span> : null}
            </span>
          </SheetTitle>
        </SheetHeader>
        <SidebarNav items={items} onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
