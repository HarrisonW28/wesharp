"use client";

import { SignOutButton, useUser } from "@clerk/nextjs";
import { Building2, ChevronDown, LogOut, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { CompanySwitcher } from "@/components/auth/CompanySwitcher";

import { useBackendMe } from "@/hooks/use-backend-me";

type UserMenuProps = {
  /** Shown in the trigger when the API profile is still loading. */
  variant: "internal" | "tenant";
};

export function UserMenu({ variant }: UserMenuProps) {
  const { user } = useUser();
  const { data } = useBackendMe();

  const label = data?.data?.user.name ?? user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Account";
  const role = data?.data?.user.role ?? "…";

  return (
    <div className="flex items-center gap-2">
      {variant === "internal" ? <CompanySwitcher /> : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="max-w-[14rem] gap-2">
            <User className="h-4 w-4 shrink-0" aria-hidden />
            <span className="hidden min-w-0 truncate sm:inline">{label}</span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="space-y-1 font-normal">
            <div className="text-sm font-medium leading-none">{label}</div>
            <div className="text-xs text-muted-foreground">
              {variant === "internal" ? "Operations" : "Customer account"}
              {variant === "internal" ? ` · ${role}` : ""}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {variant === "internal" ? (
            <>
              <DropdownMenuItem disabled className="gap-2">
                <Building2 className="h-4 w-4" aria-hidden />
                Company context (Clerk orgs later)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          <SignOutButton signOutOptions={{ redirectUrl: "/" }}>
            <button
              type="button"
              className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Sign out
            </button>
          </SignOutButton>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
