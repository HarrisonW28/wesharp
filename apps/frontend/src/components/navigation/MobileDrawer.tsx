"use client";

import type { NavItem } from "@/config/navigation";

import { SidebarNav } from "@/components/navigation/SidebarNav";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type MobileDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: NavItem[];
};

export function MobileDrawer({ open, onOpenChange, items }: MobileDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[min(92vw,20rem)] p-0">
        <SheetHeader className="border-b px-4 py-3 text-left">
          <SheetTitle className="text-sm font-semibold">WeSharp</SheetTitle>
        </SheetHeader>
        <SidebarNav items={items} onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
