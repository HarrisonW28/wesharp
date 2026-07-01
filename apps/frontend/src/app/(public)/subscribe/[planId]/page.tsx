"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
import { cn } from "@/lib/utils";

export default function SubscriptionCheckoutPage() {
  const { planId } = useParams<{ planId: string }>();
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
  const needsOrganisation = profileReady && !companyId && !setupComplete;
  const awaitingCompanyLink = setupComplete && !companyId;

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
          setError("Your account is not ready for checkout yet. Complete the profile step below, then try again.");
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
  }, [api, planId, returnPath, router]);

  useEffect(() => {
    if (!isLoaded || !planId) {
      return;
    }

    if (!userId) {
      router.replace(subscriptionCheckoutSignInPath(planId));
      return;
    }

    if (meStatus === "pending" || meFetching) {
      return;
    }

    if (meStatus !== "success") {
      return;
    }

    if (!companyId) {
      return;
    }

    if (startedRef.current) {
      return;
    }
    startedRef.current = true;

    void startCheckout();
  }, [companyId, isLoaded, meFetching, meStatus, planId, router, startCheckout, userId]);

  if (!isLoaded || !userId || meStatus === "pending" || awaitingCompanyLink || (meFetching && !profileReady)) {
    return (
      <CheckoutShell>
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" aria-hidden />
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">
            {awaitingCompanyLink ? "Linking your profile" : "Preparing checkout"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {awaitingCompanyLink
              ? "Almost there — connecting your billing profile before Stripe checkout…"
              : "Syncing your WeSharp account…"}
          </p>
        </div>
      </CheckoutShell>
    );
  }

  if (needsOrganisation) {
    return (
      <CheckoutShell className="max-w-lg text-left">
        <div className="space-y-2 text-center">
          <h1 className="text-xl font-semibold tracking-tight">One step before checkout</h1>
          <p className="text-sm text-muted-foreground">
            Tell us who to bill — then we&apos;ll take you straight to secure Stripe payment for this programme.
          </p>
        </div>
        <TenantOrganisationBootstrapForm
          submitLabel="Continue to payment"
          showAlternateSignIn={false}
          onSuccess={async () => {
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
