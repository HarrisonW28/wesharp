"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { useBackendMe } from "@/hooks/use-backend-me";
import { isSubscriptionCheckoutPath } from "@/lib/subscription-checkout-path";

type BackendHealthReport = {
  ok: boolean;
  apiOrigin: string;
  healthUrl: string;
  issues: string[];
  hints: string[];
};

/**
 * Post-sign-in handshake: wait for Laravel `/api/v1/me`, then fork staff vs tenant routes.
 * Prevents lingering on `/login`/`/account/dashboard` until the backend resolves role + company constraints.
 */
export function AuthContinueClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, userId } = useAuth();
  const { status, fetchStatus, data, error } = useBackendMe();
  const [healthReport, setHealthReport] = useState<BackendHealthReport | null>(null);

  useEffect(() => {
    if (!isLoaded || userId === null) {
      return;
    }

    if (fetchStatus === "paused" || status !== "success" || !data?.data?.user) {
      return;
    }

    const u = data.data.user;

    const returnTo = searchParams.get("returnTo");
    const safeReturnTo =
      returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : null;

    const subscribeReturn = isSubscriptionCheckoutPath(safeReturnTo);

    const target =
      safeReturnTo && u.company_id
        ? safeReturnTo
        : u.role_bucket === "internal"
          ? "/admin/dashboard"
          : u.company_id
            ? "/account/dashboard"
            : subscribeReturn && safeReturnTo
              ? safeReturnTo
              : safeReturnTo
                ? `/venue-pending?returnTo=${encodeURIComponent(safeReturnTo)}`
                : "/venue-pending";

    void router.replace(target);
  }, [data?.data?.user, fetchStatus, isLoaded, router, searchParams, status, userId]);

  useEffect(() => {
    if (status !== "error") return;
    void fetch("/api/backend-health")
      .then((res) => res.json() as Promise<BackendHealthReport>)
      .then(setHealthReport)
      .catch(() => setHealthReport(null));
  }, [status]);

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
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6 py-16 text-sm">
        <div className="text-center text-xl font-semibold text-foreground">Account setup paused</div>
        <p className="text-center text-muted-foreground">
          We Sharp could not attach your Laravel profile ({detail}). Retry sign-in, or verify the backend is reachable
          from your browser (<code>NEXT_PUBLIC_API_ORIGIN</code>) and Clerk secrets match.
        </p>

        {healthReport && (healthReport.issues.length > 0 || healthReport.hints.length > 0) ? (
          <div className="rounded-xl border bg-muted/30 p-4 text-left">
            <p className="font-medium text-foreground">Server diagnostic</p>
            {healthReport.apiOrigin ? (
              <p className="mt-1 text-xs text-muted-foreground">
                API origin: <code>{healthReport.apiOrigin}</code>
              </p>
            ) : null}
            {healthReport.issues.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground">
                {healthReport.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            ) : null}
            {healthReport.hints.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-foreground/90">
                {healthReport.hints.map((hint) => (
                  <li key={hint}>{hint}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <p className="text-center text-xs text-muted-foreground">
          In this browser tab, open your API{" "}
          <code>/api/health</code> URL. A certificate warning means Plesk needs a Let&apos;s Encrypt cert for the API
          domain before CORS or Clerk can help.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <Link className="text-primary underline" href="/login">
            Try again
          </Link>
          <Link className="text-muted-foreground underline" href="/api/backend-health" target="_blank" rel="noreferrer">
            API diagnostic JSON
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
