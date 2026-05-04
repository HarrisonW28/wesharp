"use client";

import Link from "next/link";
import { SignOutButton, useUser } from "@clerk/nextjs";
import { LayoutDashboard, LogOut, Settings } from "lucide-react";

import { useBackendMe } from "@/hooks/use-backend-me";
import { Button } from "@/components/ui/button";

function displayInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0];
    const b = parts[1]?.[0];
    if (a && b) {
      return (a + b).toUpperCase();
    }
  }
  const compact = name.replace(/\s+/g, "");
  if (compact.length >= 2) {
    return compact.slice(0, 2).toUpperCase();
  }
  return (compact[0] ?? "?").toUpperCase();
}

type AccountMobileDrawerProfileProps = {
  onNavigate: () => void;
};

/**
 * Tenant mobile drawer — signed-in identity above section nav (name, email, quick profile actions).
 */
export function AccountMobileDrawerProfile({ onNavigate }: AccountMobileDrawerProfileProps) {
  const { user } = useUser();
  const { data } = useBackendMe();

  const name = data?.data?.user.name?.trim() || user?.fullName?.trim() || "Member";
  const email = data?.data?.user.email?.trim() || user?.primaryEmailAddress?.emailAddress?.trim() || "";
  const first = name.split(/\s+/)[0] ?? name;
  const imageUrl = user?.imageUrl;

  return (
    <div className="shrink-0 border-b bg-gradient-to-br from-primary/10 via-background to-muted/30 px-4 py-4">
      <div className="flex gap-3">
        {imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element -- Clerk avatar URL, small fixed size */
          <img
            src={imageUrl}
            alt=""
            className="size-12 shrink-0 rounded-full border border-border/80 bg-card object-cover shadow-sm"
            width={48}
            height={48}
          />
        ) : (
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-full border border-border/80 bg-primary/12 text-sm font-semibold text-primary shadow-sm"
            aria-hidden
          >
            {displayInitials(name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">Your account</p>
          <p className="truncate text-base font-semibold leading-snug tracking-tight text-foreground">Hi, {first}</p>
          {email ? (
            <p className="mt-0.5 truncate text-xs leading-snug text-muted-foreground" title={email}>
              {email}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="secondary" size="sm" className="h-10 w-full rounded-lg shadow-sm" asChild>
          <Link href="/account/dashboard" onClick={onNavigate}>
            <LayoutDashboard className="mr-1.5 h-4 w-4 shrink-0" aria-hidden />
            Overview
          </Link>
        </Button>
        <Button variant="secondary" size="sm" className="h-10 w-full rounded-lg shadow-sm" asChild>
          <Link href="/account/settings" onClick={onNavigate}>
            <Settings className="mr-1.5 h-4 w-4 shrink-0" aria-hidden />
            Settings
          </Link>
        </Button>
      </div>
      <SignOutButton signOutOptions={{ redirectUrl: "/" }}>
        <button
          type="button"
          className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background/80 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          onClick={onNavigate}
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </button>
      </SignOutButton>
    </div>
  );
}
