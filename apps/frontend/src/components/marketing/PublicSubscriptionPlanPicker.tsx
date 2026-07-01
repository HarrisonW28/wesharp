"use client";

import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { apiOrigin } from "@/lib/env";
import { formatGBP } from "@/lib/format/money";
import {
  PublicSubscriptionPlansListResponseSchema,
  type PublicSubscriptionPlan,
  publicBillingCadence,
} from "@/lib/site-content/public-subscription-plans";

type Props = {
  selectedPlanId?: string;
  onSelect: (planId: string | undefined, planName?: string) => void;
  className?: string;
};

export function PublicSubscriptionPlanPicker({ selectedPlanId, onSelect, className }: Props) {
  const endpoint = useMemo(() => `${apiOrigin()}/api/public/subscription-plans`, []);
  const [plans, setPlans] = useState<PublicSubscriptionPlan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (apiOrigin() === "") {
      setError("Programmes are unavailable until the API is configured.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(endpoint, { headers: { Accept: "application/json" } });
        if (!res.ok) {
          if (!cancelled) setError("Could not load programmes.");
          return;
        }
        const raw: unknown = await res.json();
        const parsed = PublicSubscriptionPlansListResponseSchema.safeParse(raw);
        if (!parsed.success) {
          if (!cancelled) setError("Unexpected response from programmes API.");
          return;
        }
        if (!cancelled) {
          setPlans(parsed.data.data.items);
        }
      } catch {
        if (!cancelled) setError("Network error loading programmes.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  if (loading) {
    return <p className={cn("text-sm text-muted-foreground", className)}>Loading programmes…</p>;
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (plans.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        No published programmes yet — we&apos;ll recommend options after your enquiry.
      </p>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium text-foreground">Which programme interests you?</p>
      <div className="grid gap-2">
        {plans.map((plan) => {
          const selected = selectedPlanId === plan.id;
          const price =
            plan.currency === "GBP"
              ? formatGBP(plan.price_amount_minor)
              : `${plan.price_amount_minor} ${plan.currency}`;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => onSelect(selected ? undefined : plan.id, selected ? undefined : plan.name)}
              className={cn(
                "flex w-full touch-manipulation flex-col rounded-xl border p-3 text-left transition-colors",
                selected ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30",
              )}
              aria-pressed={selected}
            >
              <span className="font-medium">{plan.name}</span>
              <span className="mt-1 text-sm text-muted-foreground">
                {price} {publicBillingCadence(plan.billing_interval)}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        onClick={() => onSelect(undefined, undefined)}
      >
        Not sure yet — skip plan selection
      </button>
    </div>
  );
}

export function planLabelForId(plans: PublicSubscriptionPlan[], planId?: string): string | null {
  if (!planId) return null;
  return plans.find((p) => p.id === planId)?.name ?? null;
}
