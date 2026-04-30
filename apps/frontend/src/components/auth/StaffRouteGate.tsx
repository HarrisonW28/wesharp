"use client";

import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Loader2 } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

import { useBackendMe } from "@/hooks/use-backend-me";

export function StaffRouteGate({ children }: PropsWithChildren) {
  const router = useRouter();
  const { isLoaded: clerkLoaded, userId } = useAuth();
  const { data, status, fetchStatus, error } = useBackendMe();

  useEffect(() => {
    if (!clerkLoaded || userId === null) {
      return;
    }

    if (status !== "success" || !data?.data?.user) {
      return;
    }

    const bucket = data.data.user.role_bucket;

    if (bucket !== "internal") {
      void router.replace("/forbidden");
    }
  }, [clerkLoaded, data, router, status, userId]);

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
        <span className="text-sm">Verifying workspace access…</span>
      </div>
    );
  }

  if (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return (
      <div className="mx-auto max-w-md space-y-3 rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
        The API did not recognise this session. Ensure Next.js and Laravel are both running and{" "}
        <code>NEXT_PUBLIC_API_ORIGIN</code>
        targets the Laravel host.
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

  if (!data?.data?.user || data.data.user.role_bucket !== "internal") {
    return null;
  }

  return children;
}
