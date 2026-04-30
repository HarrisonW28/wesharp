"use client";

import { Building2, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Placeholder until multi-company operators or Clerk organisations are wired end-to-end.
 */
export function CompanySwitcher() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="hidden gap-2 text-muted-foreground lg:inline-flex">
          <Building2 className="h-4 w-4" aria-hidden />
          <span className="max-w-[9rem] truncate">WeSharp Ops</span>
          <ChevronDown className="h-4 w-4 opacity-70" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Companies</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>Single-tenant context (MVP)</DropdownMenuItem>
        <DropdownMenuItem disabled>Switching requires backend + Clerk org sync</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
