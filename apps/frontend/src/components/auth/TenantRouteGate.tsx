"use client";

import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { useBackendMe } from "@/hooks/use-backend-me";

export function TenantRouteGate({ children }: PropsWithChildren) {
  const router = useRouter();
  const { data, status, fetchStatus, error } = useBackendMe();

  useEffect(() => {
    if (status !== "success" || !data?.data?.user) {
      return;
    }

    const u = data.data.user;

    if (u.role_bucket !== "customer") {
      void router.replace("/forbidden");
      return;
    }

    if (!u.company_id) {
      void router.replace("/forbidden");
    }
  }, [data, router, status]);

  if (fetchStatus === "paused" || status === "pending") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        <span className="text-sm">Loading venue workspace…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md space-y-3 rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
        The tenant API profile could not be loaded. Confirm <code>NEXT_PUBLIC_API_ORIGIN</code>
        reaches Laravel and you are signed in with Clerk.
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
