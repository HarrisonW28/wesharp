"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { useBackendMe } from "@/hooks/use-backend-me";

/**
 * Post-sign-in handshake: wait for Laravel `/api/v1/me`, then fork staff vs tenant routes.
 * Prevents lingering on `/login`/`/account/dashboard` until the backend resolves role + company constraints.
 */
export default function AuthContinuePage() {
  const router = useRouter();
  const { isLoaded, userId } = useAuth();
  const { status, fetchStatus, data, error } = useBackendMe();

  useEffect(() => {
    if (!isLoaded || userId === null) {
      return;
    }

    if (fetchStatus === "paused" || status !== "success" || !data?.data?.user) {
      return;
    }

    const u = data.data.user;

    const target =
      u.role_bucket === "internal"
        ? "/admin/dashboard"
        : u.company_id
          ? "/account/dashboard"
          : "/venue-pending";

    void router.replace(target);
  }, [data?.data?.user, fetchStatus, isLoaded, router, status, userId]);

  if (!isLoaded || userId === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        <span className="text-sm">Preparing your session…</span>
      </div>
    );
  }

  if (fetchStatus === "paused" || status === "pending") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        <span className="text-sm">Syncing your account…</span>
      </div>
    );
  }

  if (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 py-16 text-center text-sm">
        <div className="text-xl font-semibold text-foreground">Account setup paused</div>
        <p className="text-muted-foreground">
          We Sharp could not attach your Laravel profile ({detail}). Retry sign-in, or verify the backend is reachable
          from your browser (<code>NEXT_PUBLIC_API_ORIGIN</code>) and Clerk secrets match.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link className="text-primary underline" href="/login">
            Try again
          </Link>
          <Link className="text-muted-foreground underline" href="/unauthorised">
            Diagnostics
          </Link>
          <Link className="text-muted-foreground underline" href="/">
            Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
      <span className="text-sm">Redirecting…</span>
    </div>
  );
}
