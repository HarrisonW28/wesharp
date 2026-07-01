"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { TenantOrganisationBootstrapForm } from "@/components/auth/TenantOrganisationBootstrapForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useBackendMe } from "@/hooks/use-backend-me";
import { InvoiceStripeCheckoutSessionResponseSchema } from "@/lib/api/admin-invoices-schema";
import { useAccountApi } from "@/lib/api/use-account-api";
import { PUBLIC_SITE_CONTENT_CONTAINER_CLASS } from "@/lib/public-site-layout";
import { subscriptionCheckoutSignInPath } from "@/lib/subscription-checkout-path";
import {
  defaultBootstrapRegistrationType,
  subscriptionCheckoutPhase,
} from "@/lib/subscription-checkout-state";
import { cn } from "@/lib/utils";

const PROFILE_LINK_TIMEOUT_MS = 12_000;

export function SubscribeCheckoutClient() {
  const { planId } = useParams<{ planId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isLoaded, userId } = useAuth();
  const { data: meData, status: meStatus, refetch: refetchMe, isFetching: meFetching } = useBackendMe();
  const api = useAccountApi();
  const startedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [setupComplete, setSetupComplete] = useState(false);

  const returnPath = planId ? `/subscribe/${planId}` : "/subscriptions";
  const companyId = meData?.data?.user?.company_id ?? null;
  const profileReady = meStatus === "success" && Boolean(meData?.data?.user);
  const defaultRegistrationType = defaultBootstrapRegistrationType(searchParams.get("profile"));

  const phase = subscriptionCheckoutPhase({
    isLoaded,
    userId,
    meStatus,
    meFetching,
    profileReady,
    companyId,
    setupComplete,
    hasCheckoutError: Boolean(error) && Boolean(companyId),
  });

  const resetProfileStep = useCallback(() => {
    setSetupComplete(false);
    startedRef.current = false;
  }, []);

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
          resetProfileStep();
          setError("Your billing profile is not linked yet. Complete the form below, then continue to payment.");
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
  }, [api, planId, resetProfileStep, returnPath, router]);

  useEffect(() => {
    if (!isLoaded || !planId) {
      return;
    }

    if (!userId) {
      router.replace(subscriptionCheckoutSignInPath(planId));
      return;
    }

    if (phase === "profile-loading" || phase === "needs-organisation" || phase === "linking-profile") {
      return;
    }

    if (!companyId || phase === "checkout-error") {
      return;
    }

    if (startedRef.current) {
      return;
    }
    startedRef.current = true;

    void startCheckout();
  }, [companyId, isLoaded, phase, planId, router, startCheckout, userId]);

  useEffect(() => {
    if (phase !== "linking-profile") {
      return;
    }

    const timer = window.setTimeout(() => {
      resetProfileStep();
      setError("We could not confirm your billing profile. Please try saving again.");
    }, PROFILE_LINK_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [phase, resetProfileStep]);

  if (phase === "auth-loading" || phase === "profile-loading" || phase === "linking-profile") {
    return (
      <CheckoutShell>
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" aria-hidden />
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">
            {phase === "linking-profile" ? "Linking your profile" : "Preparing checkout"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {phase === "linking-profile"
              ? "Almost there — connecting your billing profile before Stripe checkout…"
              : "Syncing your WeSharp account…"}
          </p>
        </div>
      </CheckoutShell>
    );
  }

  if (phase === "needs-organisation") {
    return (
      <CheckoutShell className="max-w-lg text-left">
        <div className="space-y-2 text-center">
          <h1 className="text-xl font-semibold tracking-tight">One step before checkout</h1>
          <p className="text-sm text-muted-foreground">
            Tell us who to bill — sole traders and home cooks are welcome. We&apos;ll take you straight to secure Stripe
            payment once this is saved.
          </p>
        </div>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <TenantOrganisationBootstrapForm
          defaultRegistrationType={defaultRegistrationType}
          submitLabel="Continue to payment"
          showAlternateSignIn={false}
          onSuccess={async () => {
            setError(null);
            setSetupComplete(true);
            startedRef.current = false;
            await refetchMe();
          }}
        />
        <div className="text-center">
          <Button type="button" variant="outline" className="rounded-lg" asChild>
            <Link href="/subscriptions">Back to programmes</Link>
          </Button>
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
