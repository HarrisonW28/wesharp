"use client";

import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { useBackendMe } from "@/hooks/use-backend-me";

export function TenantRouteGate({ children }: PropsWithChildren) {
  const router = useRouter();
  const { isLoaded: clerkLoaded, userId } = useAuth();
  const { data, status, fetchStatus, error, isFetching } = useBackendMe();

  useEffect(() => {
    if (!clerkLoaded || userId === null) {
      return;
    }

    if (status !== "success" || !data?.data?.user) {
      return;
    }

    const u = data.data.user;

    if (u.role_bucket === "internal") {
      void router.replace("/admin/dashboard");
      return;
    }

    if (u.role_bucket !== "customer") {
      void router.replace("/forbidden");
      return;
    }

    if (!u.company_id) {
      // Stale `backend-me` after bootstrap would send users back to venue-pending; wait for refetch.
      if (isFetching) {
        return;
      }
      void router.replace("/venue-pending");
    }
  }, [clerkLoaded, data, isFetching, router, status, userId]);

  if (!clerkLoaded || userId === null) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        <span className="text-sm">Initialising sign-in…</span>
      </div>
    );
  }

  if (fetchStatus === "paused" || status === "pending") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        <span className="text-sm">Loading venue workspace…</span>
      </div>
    );
  }

  const profile = data?.data?.user;
  if (
    status === "success" &&
    profile &&
    profile.role_bucket === "customer" &&
    !profile.company_id &&
    isFetching
  ) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        <span className="text-sm">Linking your workspace…</span>
      </div>
    );
  }

  if (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return (
      <div className="mx-auto max-w-md space-y-3 rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
        The tenant API profile could not be loaded. Confirm <code>NEXT_PUBLIC_API_ORIGIN</code>{" "}
        reaches Laravel and you are signed in with Clerk.
        {detail !== "" ? (
          <p className="mt-2 rounded-md bg-muted/50 px-2 py-1.5 font-mono text-xs text-foreground/80">{detail}</p>
        ) : null}
        <div>
          <Link className="text-primary underline" href="/unauthorised">
            Back to safety
          </Link>
        </div>
      </div>
    );
  }

  const u = data?.data?.user;

  if (!u || u.role_bucket !== "customer" || !u.company_id) {
    return null;
  }

  return children;
}
