"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useBackendMe } from "@/hooks/use-backend-me";
import { InvoiceStripeCheckoutSessionResponseSchema } from "@/lib/api/admin-invoices-schema";
import { useAccountApi } from "@/lib/api/use-account-api";
import { venuePendingPath } from "@/lib/safe-return-to";
import { subscriptionCheckoutSignInPath } from "@/lib/subscription-checkout-path";
import { PUBLIC_SITE_CONTENT_CONTAINER_CLASS } from "@/lib/public-site-layout";
import { cn } from "@/lib/utils";

export default function SubscriptionCheckoutPage() {
  const { planId } = useParams<{ planId: string }>();
  const router = useRouter();
  const { isLoaded, userId } = useAuth();
  const { data: meData, status: meStatus } = useBackendMe();
  const api = useAccountApi();
  const startedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const returnPath = planId ? `/subscribe/${planId}` : "/subscriptions";

  useEffect(() => {
    if (!isLoaded || !planId) {
      return;
    }

    if (!userId) {
      router.replace(subscriptionCheckoutSignInPath(planId));
      return;
    }

    if (meStatus === "pending") {
      return;
    }

    if (meStatus === "success" && !meData?.data?.user?.company_id) {
      router.replace(venuePendingPath(returnPath));
      return;
    }

    if (meStatus !== "success") {
      return;
    }

    if (startedRef.current) {
      return;
    }
    startedRef.current = true;

    async function startCheckout() {
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
            router.replace(venuePendingPath(returnPath));
            return;
          }
          setError(res.message || "Could not start subscription checkout.");
          return;
        }

        const parsed = InvoiceStripeCheckoutSessionResponseSchema.safeParse(res.data);
        if (!parsed.success) {
          setError("Unexpected response from the payment service.");
          return;
        }

        const payload = parsed.data.data;
        if (payload.checkout_url) {
          window.location.assign(payload.checkout_url);
          return;
        }

        setError(payload.disabled_reason ?? "Online subscription checkout is not available for this plan yet.");
      } catch {
        setError("Network error — could not reach the payment service.");
      }
    }

    void startCheckout();
  }, [api, isLoaded, meData?.data?.user?.company_id, meStatus, planId, returnPath, router, userId]);

  return (
    <div className={cn(PUBLIC_SITE_CONTENT_CONTAINER_CLASS, "py-16 md:py-24")}>
      <div className="mx-auto max-w-lg space-y-6 text-center">
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
            <Button type="button" className="rounded-lg" onClick={() => window.location.reload()}>
              Try again
            </Button>
          ) : null}
          <Button type="button" variant="outline" className="rounded-lg" asChild>
            <Link href="/subscriptions">Back to programmes</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
