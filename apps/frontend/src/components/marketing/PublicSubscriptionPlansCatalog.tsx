"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { apiOrigin } from "@/lib/env";
import { formatGBP } from "@/lib/format/money";
import {
  PublicSubscriptionPlansListResponseSchema,
  type PublicSubscriptionPlan,
  publicBillingCadence,
} from "@/lib/site-content/public-subscription-plans";
import { cn } from "@/lib/utils";

function allowanceLine(plan: PublicSubscriptionPlan): string | null {
  const parts: string[] = [];
  if (plan.included_collections != null) {
    parts.push(`${plan.included_collections} collections`);
  }
  if (plan.included_knife_allowance != null) {
    parts.push(`${plan.included_knife_allowance} knives`);
  }
  if (!parts.length) return null;
  return `${parts.join(" · ")} included per period`;
}

function bookEnquiryHrefForPlan(planName: string): string {
  const p = new URLSearchParams();
  p.set("programme", "subscription");
  p.set("plan_name", planName);
  return `/book?${p.toString()}`;
}

const BESPOKE_BOOK_HREF = "/book?programme=subscription&custom_plan=1";

type CatalogueState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; plans: PublicSubscriptionPlan[] };

function CatalogueSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading programmes">
      {[0, 1, 2].map((k) => (
        <div key={k} className="h-64 animate-pulse rounded-2xl border bg-muted/40" />
      ))}
    </div>
  );
}

type Props = {
  /** Extra hint under the grid (e.g. CMS copy on the homepage). */
  footer?: string;
  className?: string;
};

/**
 * Live subscription plan cards from **`GET /api/public/subscription-plans`**, plus an always-on bespoke CTA card.
 */
export function PublicSubscriptionPlansCatalog(props: Props) {
  const { footer, className } = props;
  const endpoint = useMemo(() => `${apiOrigin()}/api/public/subscription-plans`, []);
  const [state, setState] = useState<CatalogueState>({ status: "loading" });

  useEffect(() => {
    if (apiOrigin() === "") {
      setState({
        status: "error",
        message: "Set NEXT_PUBLIC_API_ORIGIN so we can load the live programme catalogue.",
      });
      return;
    }

    let cancelled = false;

    async function run() {
      setState({ status: "loading" });
      try {
        const res = await fetch(endpoint, { headers: { Accept: "application/json" } });
        if (!res.ok) {
          if (!cancelled) {
            setState({ status: "error", message: `Could not load programmes (${res.status}). Try again shortly.` });
          }
          return;
        }
        const raw: unknown = await res.json();
        const parsed = PublicSubscriptionPlansListResponseSchema.safeParse(raw);
        if (!parsed.success) {
          if (!cancelled) {
            setState({ status: "error", message: "Unexpected response from the programmes API." });
          }
          return;
        }
        if (!cancelled) {
          setState({ status: "ready", plans: parsed.data.data.items });
        }
      } catch {
        if (!cancelled) {
          setState({ status: "error", message: "Network error loading programmes." });
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  return (
    <div className={cn("space-y-4", className)}>
      {state.status === "error" ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      {state.status === "loading" ? <CatalogueSkeleton /> : null}

      {state.status === "ready" ? (
        <>
          {state.plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No published programmes are listed on the marketing site yet — you can still request a bespoke schedule
              below or book a collection to talk it through.
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {state.plans.map((plan) => {
              const recommended = Boolean(plan.recommended);
              const priceLabel =
                plan.currency === "GBP"
                  ? formatGBP(plan.price_amount_minor)
                  : `${plan.price_amount_minor} ${plan.currency}`;
              const cadence = publicBillingCadence(plan.billing_interval);
              const allowance = allowanceLine(plan);
              const overage =
                plan.overage_price_amount_minor != null && plan.currency === "GBP"
                  ? `Overage from ${formatGBP(plan.overage_price_amount_minor)} per knife beyond allowance`
                  : plan.overage_price_amount_minor != null
                    ? `Overage from ${plan.overage_price_amount_minor} ${plan.currency} per knife beyond allowance`
                    : null;
              const highlights = plan.public_highlights ?? [];
              const cta = (plan.public_cta_label ?? "").trim() || "Choose plan";

              return (
                <Card
                  key={plan.id}
                  className={cn("flex flex-col border-border/80 shadow-sm", recommended && "border-primary/35 bg-primary/5")}
                >
                  <CardHeader className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base font-semibold leading-snug">{plan.name}</CardTitle>
                      {recommended ? (
                        <Badge variant="secondary" className="font-normal">
                          Recommended
                        </Badge>
                      ) : null}
                    </div>
                    {plan.description ? <CardDescription className="text-sm leading-relaxed">{plan.description}</CardDescription> : null}
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-3 text-sm">
                    <div>
                      <div className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                        {priceLabel}{" "}
                        <span className="text-base font-normal text-muted-foreground">{cadence}</span>
                      </div>
                      {allowance ? <p className="mt-2 text-xs text-muted-foreground">{allowance}</p> : null}
                      {overage ? <p className="mt-1 text-xs text-muted-foreground">{overage}</p> : null}
                    </div>
                    {highlights.length > 0 ? (
                      <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                        {highlights.map((line, i) => (
                          <li key={`${i}-${line}`}>{line}</li>
                        ))}
                      </ul>
                    ) : null}
                  </CardContent>
                  <CardFooter className="mt-auto flex flex-col items-stretch gap-2 border-t pt-4 sm:flex-row sm:justify-end">
                    <Button asChild className="rounded-lg">
                      <Link href={bookEnquiryHrefForPlan(plan.name)}>{cta}</Link>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}

            <Card className="flex flex-col border-dashed border-primary/30 bg-muted/20 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Custom / bespoke plan</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  For businesses with different volume, frequency, or collection needs — we&apos;ll design a schedule and
                  allowance that fits.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 text-xs text-muted-foreground">
                Tell us about your line, openings, and how often you need us — we&apos;ll come back with options.
              </CardContent>
              <CardFooter className="mt-auto flex flex-col items-stretch gap-2 border-t pt-4 sm:flex-row sm:justify-end">
                <Button variant="outline" asChild className="rounded-lg">
                  <Link href={BESPOKE_BOOK_HREF}>Request custom plan</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </>
      ) : null}

      {footer ? <p className="text-xs text-muted-foreground">{footer}</p> : null}
    </div>
  );
}
