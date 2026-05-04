"use client";

import { ChevronDown } from "lucide-react";

import { PUBLIC_SITE_NAV_SECTIONS, publicSiteNavTriggerId } from "@/config/public-site-nav";
import type { PublicSiteNavSection } from "@/config/public-site-nav";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const triggerClass =
  "h-9 gap-1 px-2 text-sm font-normal text-muted-foreground transition-colors hover:bg-transparent hover:text-foreground data-[state=open]:text-foreground";

type PublicSiteNavMenuProps = {
  openSection: PublicSiteNavSection | null;
  onOpenSection: (section: PublicSiteNavSection) => void;
  onClose: () => void;
};

/**
 * Desktop (lg+): section label toggles the shared mega-panel (positioned under the header in {@see PublicShell}).
 */
export function PublicSiteNavMenu({ openSection, onOpenSection, onClose }: PublicSiteNavMenuProps) {
  return (
    <ul
      data-public-mega-triggers
      className="flex max-w-[min(100%,56rem)] flex-wrap items-center justify-center gap-x-0.5 gap-y-1"
    >
      {PUBLIC_SITE_NAV_SECTIONS.map((section) => {
        const isOpen = openSection?.label === section.label;
        return (
          <li key={section.label}>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              id={publicSiteNavTriggerId(section.label)}
              className={cn(triggerClass, isOpen && "bg-accent/50 text-foreground")}
              aria-expanded={isOpen}
              aria-controls="public-site-mega-panel"
              onClick={() => (isOpen ? onClose() : onOpenSection(section))}
            >
              <span className="max-w-[11rem] truncate sm:max-w-[13rem]">{section.label}</span>
              <ChevronDown
                className={cn("h-4 w-4 shrink-0 opacity-60 transition-transform", isOpen && "rotate-180")}
                aria-hidden
              />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
