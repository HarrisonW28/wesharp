"use client";

import { SignOutButton, SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { ChevronDown, LayoutDashboard, LogOut, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

function profileLabel(user: ReturnType<typeof useUser>["user"]) {
  if (!user) return "Account";
  return (
    user.firstName ||
    user.fullName ||
    user.primaryEmailAddress?.emailAddress ||
    user.emailAddresses[0]?.emailAddress ||
    "Account"
  );
}

function profileEmail(user: ReturnType<typeof useUser>["user"]) {
  return user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress ?? "";
}

type SignedInMenuProps = {
  align: "end" | "start";
  onNavigate?: () => void;
  compactTrigger?: boolean;
};

function SignedInMenu({ align, onNavigate, compactTrigger }: SignedInMenuProps) {
  const { user } = useUser();
  const label = profileLabel(user);
  const email = profileEmail(user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          type="button"
          className={cn(
            "touch-manipulation gap-2 rounded-lg px-2.5 sm:px-3",
            compactTrigger && "max-w-[min(11rem,calc(100vw-9rem))]",
            !compactTrigger && "max-w-[min(14rem,40vw)]",
          )}
        >
          {user?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Clerk-hosted avatar URL
            <img
              src={user.imageUrl}
              alt=""
              className="h-7 w-7 shrink-0 rounded-full object-cover"
              width={28}
              height={28}
            />
          ) : (
            <User className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          )}
          <span className="min-w-0 truncate text-left text-sm font-medium">{label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-60">
        <DropdownMenuLabel className="space-y-1 font-normal">
          <div className="text-sm font-medium leading-tight">{label}</div>
          {email ? <div className="truncate text-xs text-muted-foreground">{email}</div> : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/auth/continue" className="flex cursor-pointer items-center gap-2" onClick={onNavigate}>
            <LayoutDashboard className="h-4 w-4" aria-hidden />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <SignOutButton signOutOptions={{ redirectUrl: "/" }}>
          <button
            type="button"
            className="relative flex min-h-10 w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </button>
        </SignOutButton>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export type PublicSiteAccountControlProps = {
  variant: "desktop" | "sheet-header";
  onNavigate?: () => void;
};

export function PublicSiteAccountControl({ variant, onNavigate }: PublicSiteAccountControlProps) {
  const close = () => onNavigate?.();

  if (variant === "sheet-header") {
    return (
      <>
        <SignedOut>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-0.5 text-sm font-medium leading-none">
            <Link
              href="/login"
              className="whitespace-nowrap text-foreground underline-offset-4 hover:underline"
              onClick={close}
            >
              Sign in
            </Link>
            <span className="select-none text-muted-foreground" aria-hidden>
              ·
            </span>
            <Link
              href="/register"
              className="whitespace-nowrap text-foreground underline-offset-4 hover:underline"
              onClick={close}
            >
              Register
            </Link>
          </div>
        </SignedOut>
        <SignedIn>
          <SignedInMenu align="end" onNavigate={close} compactTrigger />
        </SignedIn>
      </>
    );
  }

  return (
    <div className="hidden md:block">
      <SignedOut>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" type="button" className="gap-1.5 rounded-lg px-3">
              <User className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              Account
              <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/login" onClick={close}>
                Sign in
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/register" onClick={close}>
                Create account
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SignedOut>
      <SignedIn>
        <SignedInMenu align="end" onNavigate={close} />
      </SignedIn>
    </div>
  );
}
