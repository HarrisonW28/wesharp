"use client";

import Link from "next/link";
import { useMemo } from "react";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { ChevronDown, LayoutDashboard, LogIn, UserPlus } from "lucide-react";

import { ACCOUNT_NAV_SECTIONS, filterNavSections } from "@/config/navigation";
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
import { useBackendMe } from "@/hooks/use-backend-me";
import { cn } from "@/lib/utils";

function useFilteredAccountNav() {
  const { data, isLoading } = useBackendMe();
  const permissions = useMemo(() => new Set(data?.data?.permissions ?? []), [data?.data?.permissions]);
  const navSections = useMemo(
    () => filterNavSections(ACCOUNT_NAV_SECTIONS, permissions),
    [permissions],
  );
  return { navSections, isLoading };
}

/** Desktop: one trigger replaces separate Sign in / Create account / My account buttons (avoids header overlap). */
export function PublicAccountMenu() {
  const { navSections, isLoading } = useFilteredAccountNav();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="hidden max-w-[11rem] gap-1.5 truncate md:inline-flex"
          aria-label="Account menu"
        >
          <span className="min-w-0 truncate">Account</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="max-h-[min(32rem,70vh)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain p-2"
      >
        <SignedOut>
          <DropdownMenuGroup className="space-y-2">
            <div className="rounded-lg border bg-muted/40 px-1 py-2">
              <DropdownMenuLabel className="px-3 pb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Get started
              </DropdownMenuLabel>
              <DropdownMenuItem asChild className="rounded-md">
                <Link href="/register" className="flex cursor-pointer items-start gap-3 py-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background shadow-sm">
                    <UserPlus className="h-4 w-4 text-primary" aria-hidden />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-medium leading-tight">Create account</span>
                    <span className="text-xs font-normal leading-snug text-muted-foreground">
                      Book online, track visits, and manage your plan.
                    </span>
                  </span>
                </Link>
              </DropdownMenuItem>
            </div>
            <div className="rounded-lg border bg-muted/40 px-1 py-2">
              <DropdownMenuLabel className="px-3 pb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Returning
              </DropdownMenuLabel>
              <DropdownMenuItem asChild className="rounded-md">
                <Link href="/login" className="flex cursor-pointer items-start gap-3 py-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background shadow-sm">
                    <LogIn className="h-4 w-4 text-primary" aria-hidden />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-medium leading-tight">Sign in</span>
                    <span className="text-xs font-normal leading-snug text-muted-foreground">
                      Customer portal, bookings, and invoices.
                    </span>
                  </span>
                </Link>
              </DropdownMenuItem>
            </div>
          </DropdownMenuGroup>
        </SignedOut>

        <SignedIn>
          {isLoading ? (
            <DropdownMenuGroup>
              <DropdownMenuItem asChild className="rounded-md">
                <Link href="/auth/continue" className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden />
                  Open my account
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          ) : (
            <>
              {navSections.map((section, idx) => (
                <div key={section.label}>
                  {idx > 0 ? <DropdownMenuSeparator className="my-2" /> : null}
                  <DropdownMenuGroup className="rounded-lg border bg-muted/40 px-1 py-2">
                    <DropdownMenuLabel className="px-3 pb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                      {section.label}
                    </DropdownMenuLabel>
                    {section.items.map((item) => {
                      if (!item.href) {
                        return null;
                      }
                      const Icon = item.icon;
                      return (
                        <DropdownMenuItem key={`${section.label}-${item.title}`} asChild className="rounded-md">
                          <Link href={item.href} className="flex cursor-pointer items-center gap-3 py-2.5">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background shadow-sm">
                              <Icon className="h-4 w-4 text-primary" aria-hidden />
                            </span>
                            <span className="min-w-0 font-medium leading-tight">{item.title}</span>
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuGroup>
                </div>
              ))}
            </>
          )}
        </SignedIn>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const mobileLinkClass =
  "flex min-h-11 items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm transition-colors hover:border-border hover:bg-muted/50 touch-manipulation";

/** Mobile sheet: card-style groups aligned with portal nav sections. */
export function PublicMobileAccountNav({ onNavigate }: { onNavigate: () => void }) {
  const { navSections, isLoading } = useFilteredAccountNav();

  return (
    <div className="flex flex-col gap-3">
      <SignedOut>
        <div className="rounded-xl border bg-muted/30 p-3">
          <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">Get started</p>
          <Link
            href="/register"
            className={cn(mobileLinkClass, "mb-2 border-border/80 bg-background shadow-sm")}
            onClick={onNavigate}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted/30">
              <UserPlus className="h-4 w-4 text-primary" aria-hidden />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-medium">Create account</span>
              <span className="text-xs text-muted-foreground">Book online and track your visits.</span>
            </span>
          </Link>
        </div>
        <div className="rounded-xl border bg-muted/30 p-3">
          <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">Returning</p>
          <Link href="/login" className={cn(mobileLinkClass, "border-border/80 bg-background shadow-sm")} onClick={onNavigate}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted/30">
              <LogIn className="h-4 w-4 text-primary" aria-hidden />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-medium">Sign in</span>
              <span className="text-xs text-muted-foreground">Customer portal and invoices.</span>
            </span>
          </Link>
        </div>
      </SignedOut>

      <SignedIn>
        {isLoading ? (
          <Link
            href="/auth/continue"
            className={cn(mobileLinkClass, "border-border/80 bg-background shadow-sm")}
            onClick={onNavigate}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted/30">
              <LayoutDashboard className="h-4 w-4 text-primary" aria-hidden />
            </span>
            <span className="font-medium">Open my account</span>
          </Link>
        ) : (
          navSections.map((section) => (
            <div key={section.label} className="rounded-xl border bg-muted/30 p-3">
              <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">{section.label}</p>
              <div className="flex flex-col gap-1.5">
                {section.items.map((item) => {
                  if (!item.href) {
                    return null;
                  }
                  const Icon = item.icon;
                  return (
                    <Link
                      key={`${section.label}-${item.title}`}
                      href={item.href}
                      className={cn(mobileLinkClass, "border-border/60 bg-background/80")}
                      onClick={onNavigate}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted/30">
                        <Icon className="h-4 w-4 text-primary" aria-hidden />
                      </span>
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </SignedIn>
    </div>
  );
}
