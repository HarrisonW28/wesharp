"use client";

import { ChevronDown } from "lucide-react";

import { PublicSiteNavSectionCards } from "@/components/layout/PublicSiteNavCards";
import { PUBLIC_SITE_NAV_SECTIONS } from "@/config/public-site-nav";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const triggerClass =
  "h-9 gap-1 px-2 text-sm font-normal text-muted-foreground transition-colors hover:bg-transparent hover:text-foreground data-[state=open]:text-foreground";

/**
 * Desktop (lg+): one parent per IA section — label opens a panel of card links (no single “Browse” bucket).
 */
export function PublicSiteNavMenu() {
  return (
    <ul className="flex max-w-[min(100%,56rem)] flex-wrap items-center justify-center gap-x-0.5 gap-y-1">
      {PUBLIC_SITE_NAV_SECTIONS.map((section) => (
        <li key={section.label}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(triggerClass)}
                aria-label={`${section.label} — open pages in this section`}
              >
                <span className="max-w-[11rem] truncate sm:max-w-[13rem]">{section.label}</span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={8}
              collisionPadding={16}
              className="max-h-[min(85vh,40rem)] w-[min(calc(100vw-2rem),22rem)] overflow-y-auto overscroll-contain p-4 sm:w-[min(28rem,calc(100vw-2rem))] sm:p-5"
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <PublicSiteNavSectionCards section={section} layout="menu" />
            </DropdownMenuContent>
          </DropdownMenu>
        </li>
      ))}
    </ul>
  );
}
