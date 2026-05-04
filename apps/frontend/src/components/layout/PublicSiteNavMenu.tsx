"use client";

import { LayoutGrid } from "lucide-react";

import { PublicSiteNavSectionsCards } from "@/components/layout/PublicSiteNavCards";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const triggerClass =
  "h-9 gap-1.5 px-2.5 text-sm font-normal text-muted-foreground transition-colors hover:bg-transparent hover:text-foreground data-[state=open]:text-foreground";

/** Desktop (lg+): mega-style card grid — same visual language as portal dashboard cards. */
export function PublicSiteNavMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(triggerClass, "whitespace-nowrap")}
          aria-label="Browse the website"
        >
          <LayoutGrid className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          Browse
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        sideOffset={8}
        className="max-h-[min(85vh,40rem)] w-[min(calc(100vw-1.5rem),40rem)] overflow-y-auto overscroll-contain p-4 sm:p-5"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <PublicSiteNavSectionsCards layout="menu" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
