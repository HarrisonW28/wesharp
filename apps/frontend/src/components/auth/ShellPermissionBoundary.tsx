"use client";

import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useBackendMe } from "@/hooks/use-backend-me";
import { accountPermissionForPath, adminPermissionForPath } from "@/lib/route-permissions";

type ShellPermissionBoundaryProps = PropsWithChildren<{
  /** Which portal’s path→permission map to use (serializable for RSC prerender). */
  scope: "admin" | "account";
  /** Visible while permissions are loading — keeps deep links from flashing forbidden. */
  label?: string;
}>;

/**
 * Ensures SPA navigation cannot render admin or customer consoles without the matching Laravel permission.
 */
export function ShellPermissionBoundary({
  scope,
  children,
  label = scope === "account" ? "Checking your account access…" : "Checking permissions…",
}: ShellPermissionBoundaryProps) {
  const pathname = usePathname();
  const router = useRouter();
  const resolver = scope === "account" ? accountPermissionForPath : adminPermissionForPath;
  const required = resolver(pathname);
  const { data, status, fetchStatus, error } = useBackendMe();

  useEffect(() => {
    if (status !== "success" || error) {
      return;
    }

    const perms = new Set(data?.data?.permissions ?? []);

    if (required !== "" && !perms.has(required)) {
      void router.replace("/forbidden");
    }
  }, [data, error, required, router, status]);

  if (fetchStatus === "paused" || status === "pending") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        <span className="text-sm">{label}</span>
      </div>
    );
  }

  if (error || !data?.data?.permissions) {
    return (
      <div className="mx-auto max-w-md space-y-3 rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
        The API profile needed for permission checks could not be loaded. Confirm{" "}
        <code className="rounded bg-muted px-1 py-0.5">NEXT_PUBLIC_API_ORIGIN</code> reaches Laravel.
        <div className="pt-2">
          <Link href="/unauthorised" className="font-medium text-primary underline">
            Back to sign-in guidance
          </Link>
        </div>
      </div>
    );
  }

  if (!new Set(data.data.permissions).has(required)) {
    return (
      <div className="flex min-h-[30vh] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
        <span className="text-sm">Redirecting…</span>
      </div>
    );
  }

  return children;
}
