"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { PUBLIC_SITE_NAV_SECTIONS } from "@/config/public-site-nav";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const triggerClass =
  "h-9 gap-1 px-2 text-sm font-normal text-muted-foreground transition-colors hover:bg-transparent hover:text-foreground data-[state=open]:text-foreground";

/** Desktop (lg+): grouped site links — same structure as the mobile sheet sections. */
export function PublicSiteNavMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={cn(triggerClass, "whitespace-nowrap")} aria-label="Explore the website">
          Explore
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        sideOffset={8}
        className="max-h-[min(32rem,70vh)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain p-2"
      >
        {PUBLIC_SITE_NAV_SECTIONS.map((section, idx) => (
          <div key={section.label}>
            {idx > 0 ? <DropdownMenuSeparator className="my-2" /> : null}
            <DropdownMenuGroup className="rounded-lg border bg-muted/40 px-1 py-2">
              <DropdownMenuLabel className="px-3 pb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                {section.label}
              </DropdownMenuLabel>
              {section.links.map((l) => (
                <DropdownMenuItem key={l.href} asChild className="rounded-md">
                  <Link href={l.href} className="cursor-pointer py-2.5 font-medium">
                    {l.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
