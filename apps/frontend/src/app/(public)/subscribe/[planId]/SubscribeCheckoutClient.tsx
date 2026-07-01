"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useBackendMe } from "@/hooks/use-backend-me";
import { InvoiceStripeCheckoutSessionResponseSchema } from "@/lib/api/admin-invoices-schema";
import { useAccountApi } from "@/lib/api/use-account-api";
import { PUBLIC_SITE_CONTENT_CONTAINER_CLASS } from "@/lib/public-site-layout";
import { subscriptionCheckoutSignInPath } from "@/lib/subscription-checkout-path";
import { subscriptionCheckoutPhase } from "@/lib/subscription-checkout-state";
import { cn } from "@/lib/utils";

export function SubscribeCheckoutClient() {
  const { planId } = useParams<{ planId: string }>();
  const router = useRouter();
  const { isLoaded, userId } = useAuth();
  const { data: meData, status: meStatus, isFetching: meFetching, refetch: refetchMe } = useBackendMe();
  const api = useAccountApi();
  const startedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const returnPath = planId ? `/subscribe/${planId}` : "/subscriptions";
  const companyId = meData?.data?.user?.company_id ?? null;
  const profileReady = meStatus === "success" && Boolean(meData?.data?.user);

  const phase = subscriptionCheckoutPhase({
    isLoaded,
    userId,
    meStatus,
    meFetching,
    profileReady,
    companyId,
    hasCheckoutError: Boolean(error) && Boolean(companyId),
  });

  const redirectToProfileSetup = useCallback(() => {
    router.replace(`/venue-pending?returnTo=${encodeURIComponent(returnPath)}`);
  }, [returnPath, router]);

  const startCheckout = useCallback(async () => {
    if (!planId) {
      return;
    }

    setError(null);
    try {
      const res = await api.json<unknown>("/api/account/subscription/stripe-checkout-session", {
        method: "POST",
        body: JSON.stringify({ subscription_plan_id: planId }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.replace(`/auth/continue?returnTo=${encodeURIComponent(returnPath)}`);
          return;
        }
        if (res.status === 403) {
          const refreshed = await refetchMe();
          const linkedCompanyId = refreshed.data?.data?.user?.company_id ?? null;
          if (!linkedCompanyId) {
            redirectToProfileSetup();
            return;
          }
          setError(res.message || "Checkout is not available for this account or plan.");
          startedRef.current = false;
          return;
        }
        setError(res.message || "Could not start subscription checkout.");
        startedRef.current = false;
        return;
      }

      const parsed = InvoiceStripeCheckoutSessionResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        setError("Unexpected response from the payment service.");
        startedRef.current = false;
        return;
      }

      const payload = parsed.data.data;
      if (payload.checkout_url) {
        window.location.assign(payload.checkout_url);
        return;
      }

      setError(payload.disabled_reason ?? "Online subscription checkout is not available for this plan yet.");
      startedRef.current = false;
    } catch {
      setError("Network error — could not reach the payment service.");
      startedRef.current = false;
    }
  }, [api, planId, redirectToProfileSetup, refetchMe, returnPath, router]);

  useEffect(() => {
    if (!isLoaded || !planId) {
      return;
    }

    if (!userId) {
      router.replace(subscriptionCheckoutSignInPath(planId));
      return;
    }

    if (phase === "needs-organisation") {
      redirectToProfileSetup();
      return;
    }

    if (phase !== "starting-checkout") {
      return;
    }

    if (startedRef.current) {
      return;
    }
    startedRef.current = true;

    void startCheckout();
  }, [isLoaded, phase, planId, redirectToProfileSetup, router, startCheckout, userId]);

  if (phase === "auth-loading" || phase === "profile-loading" || phase === "needs-organisation") {
    return (
      <CheckoutShell>
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" aria-hidden />
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">
            {phase === "needs-organisation" ? "Finish your profile first" : "Preparing checkout"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {phase === "needs-organisation"
              ? "Taking you to complete your WeSharp billing profile before payment…"
              : "Syncing your WeSharp account…"}
          </p>
        </div>
      </CheckoutShell>
    );
  }

  return (
    <CheckoutShell>
      <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" aria-hidden />
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">Taking you to secure checkout</h1>
        <p className="text-sm text-muted-foreground">
          You&apos;ll complete payment on Stripe. If nothing happens in a few seconds, use the button below.
        </p>
      </div>
      {error ? (
        <Alert variant="destructive" className="text-left">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap justify-center gap-3">
        {error ? (
          <Button
            type="button"
            className="rounded-lg"
            onClick={() => {
              startedRef.current = false;
              void startCheckout();
            }}
          >
            Try again
          </Button>
        ) : null}
        <Button type="button" variant="outline" className="rounded-lg" asChild>
          <Link href="/subscriptions">Back to programmes</Link>
        </Button>
      </div>
    </CheckoutShell>
  );
}

function CheckoutShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(PUBLIC_SITE_CONTENT_CONTAINER_CLASS, "py-16 md:py-24")}>
      <div className={cn("mx-auto max-w-lg space-y-6 text-center", className)}>{children}</div>
    </div>
  );
}
