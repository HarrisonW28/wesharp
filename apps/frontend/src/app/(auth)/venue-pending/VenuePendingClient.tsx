"use client";

import Link from "next/link";
import { useAuth, useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { TenantOrganisationBootstrapForm } from "@/components/auth/TenantOrganisationBootstrapForm";
import { Button } from "@/components/ui/button";
import { safeReturnTo } from "@/lib/safe-return-to";

export function VenuePendingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("returnTo"), "");
  const { isLoaded, userId } = useAuth();
  const { user } = useUser();

  const primaryEmail =
    user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? "";

  if (!isLoaded) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  if (!userId) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">Sign in first to finish setting up your business on WeSharp.</p>
        <Button type="button" asChild variant="outline">
          <Link href="/login">Sign in</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-4 py-12">
      <div className="text-center">
        <h1 className="text-xl font-semibold tracking-tight">Finish your WeSharp profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Signed in as {primaryEmail}. We create your business profile for billing and collections — choose
          whether you are an individual or representing a business venue.
        </p>
      </div>

      <TenantOrganisationBootstrapForm
        onSuccess={() => {
          router.replace(returnTo !== "" ? returnTo : "/account/dashboard");
          router.refresh();
        }}
      />

      <button
        type="button"
        className="self-center text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50"
        onClick={() => typeof window !== "undefined" && window.location.reload()}
      >
        Reload
      </button>
    </main>
  );
}
