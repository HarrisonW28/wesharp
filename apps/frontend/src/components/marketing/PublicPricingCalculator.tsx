"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Calculator, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiOrigin } from "@/lib/env";
import { formatGBP } from "@/lib/format/money";
import { PublicPricingEstimateResponseSchema, type PublicPricingEstimateResponse } from "@/lib/public-pricing-estimate-schema";
import { publicBillingCadence } from "@/lib/site-content/public-subscription-plans";
import { cn } from "@/lib/utils";

function bookHrefFromCalculator(
  state: {
    knifeCount: string;
    postcode: string;
    programmeMode: "pay_as_you_go" | "subscription";
    visitPattern: "single" | "regular";
    serviceType: "collection" | "onsite";
  },
  estimate: PublicPricingEstimateResponse | null,
): string {
  const p = new URLSearchParams();
  const kn = state.knifeCount.trim();
  if (kn !== "") p.set("knives", kn);
  const pc = state.postcode.trim();
  if (pc !== "") p.set("postcode", pc);
  p.set("service", state.serviceType);
  if (state.programmeMode === "subscription") {
    p.set("programme", "subscription");
    const plan = estimate?.subscription_plan;
    if (plan?.name?.trim()) {
      p.set("plan_name", plan.name.trim().slice(0, 120));
    }
    if (plan?.id?.trim()) {
      p.set("subscription_plan_id", plan.id.trim());
    }
  } else if (state.visitPattern === "regular") {
    p.set("programme", "unsure");
  } else {
    p.set("programme", "one_off");
  }

  if (estimate?.programme_mode === "pay_as_you_go") {
    const amt = estimate.amount_pence;
    if (amt !== null && estimate.currency === "GBP") {
      p.set("from_price_guide", "1");
      p.set("estimate_pence", String(amt));
      const rule = estimate.pricing_rule_name?.trim();
      if (rule) {
        p.set("pricing_rule", rule.slice(0, 120));
      }
    }
  }

  const q = p.toString();

  return q !== "" ? `/book?${q}` : "/book";
}

export function PublicPricingCalculator({ className }: { className?: string }) {
  const endpoint = useMemo(() => `${apiOrigin()}/api/public/pricing-estimate`, []);
  const [knifeCount, setKnifeCount] = useState("8");
  const [postcode, setPostcode] = useState("");
  const [customerKind, setCustomerKind] = useState<"home" | "business">("home");
  const [visitPattern, setVisitPattern] = useState<"single" | "regular">("single");
  const [programmeMode, setProgrammeMode] = useState<"pay_as_you_go" | "subscription">("pay_as_you_go");
  const [serviceType, setServiceType] = useState<"collection" | "onsite">("collection");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PublicPricingEstimateResponse | null>(null);

  async function runEstimate() {
    setError(null);
    setResult(null);
    if (apiOrigin() === "") {
      setError("Set NEXT_PUBLIC_API_ORIGIN so we can reach the pricing API.");
      return;
    }

    const kn = Number(knifeCount);
    if (!Number.isFinite(kn) || kn < 1) {
      setError("Enter how many knives or tools you need sharpened (at least one).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          knife_count: Math.min(500, Math.floor(kn)),
          postcode: postcode.trim() !== "" ? postcode.trim() : null,
          programme_mode: programmeMode,
          service_type: serviceType,
          visit_pattern: visitPattern,
          customer_kind: customerKind,
        }),
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        const msg =
          typeof json === "object" && json !== null && "error" in json && typeof (json as { error?: { message?: string } }).error?.message === "string"
            ? (json as { error: { message: string } }).error.message
            : "Could not calculate an estimate.";
        setError(msg);
        return;
      }
      const data = typeof json === "object" && json !== null && "data" in json ? (json as { data: unknown }).data : json;
      const parsed = PublicPricingEstimateResponseSchema.safeParse(data);
      if (!parsed.success) {
        setError("Unexpected response from the server.");
        return;
      }
      setResult(parsed.data);
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  }

  const bookHref = bookHrefFromCalculator(
    {
      knifeCount,
      postcode,
      programmeMode,
      visitPattern,
      serviceType,
    },
    result,
  );

  return (
    <Card className={cn("border-border/80 shadow-sm", className)}>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Calculator className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          Price guide calculator
        </CardTitle>
        <CardDescription>
          Amounts are in GBP (£). Rough numbers from the same rules and subscription plans we use in the workshop — not a
          final quote.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {apiOrigin() === "" && (
          <Alert variant="destructive">
            <AlertDescription>
              Connect <code className="font-mono">NEXT_PUBLIC_API_ORIGIN</code> to enable live estimates.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="pc-knives">How many knives or items?</Label>
            <Input
              id="pc-knives"
              className="h-11 sm:h-10"
              inputMode="numeric"
              value={knifeCount}
              onChange={(e) => setKnifeCount(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="pc-postcode">Postcode (optional but helps for pay-as-you-go)</Label>
            <Input
              id="pc-postcode"
              className="h-11 sm:h-10"
              placeholder="e.g. M1 1AA"
              autoComplete="postal-code"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pc-kind">Home or business?</Label>
            <select
              id="pc-kind"
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-10"
              value={customerKind}
              onChange={(e) => setCustomerKind(e.target.value as "home" | "business")}
            >
              <option value="home">Home / household</option>
              <option value="business">Business or hospitality</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pc-visit">Visit pattern</Label>
            <select
              id="pc-visit"
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-10"
              value={visitPattern}
              onChange={(e) => setVisitPattern(e.target.value as "single" | "regular")}
            >
              <option value="single">One-off visit</option>
              <option value="regular">We visit regularly</option>
            </select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="pc-prog">Programme</Label>
            <select
              id="pc-prog"
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-10"
              value={programmeMode}
              onChange={(e) => {
                const v = e.target.value as "pay_as_you_go" | "subscription";
                setProgrammeMode(v);
                if (v === "subscription") {
                  setServiceType("collection");
                }
              }}
            >
              <option value="pay_as_you_go">Pay as you go (per visit)</option>
              <option value="subscription">Subscription / care programme</option>
            </select>
          </div>
          {programmeMode === "pay_as_you_go" ? (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="pc-service">How we work</Label>
              <select
                id="pc-service"
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-10"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as "collection" | "onsite")}
              >
                <option value="collection">We collect and return from your address</option>
                <option value="onsite">On-site sharpening at your venue</option>
              </select>
            </div>
          ) : null}
        </div>

        <Button type="button" className="h-11 w-full sm:w-auto" onClick={() => void runEstimate()} disabled={loading || apiOrigin() === ""}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Calculating…
            </>
          ) : (
            "Show estimate"
          )}
        </Button>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {result ? (
          <div className="space-y-4 rounded-xl border bg-muted/25 p-4 dark:bg-muted/10">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{result.estimate_title}</p>
              {result.amount_pence !== null && result.currency === "GBP" ? (
                <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{formatGBP(result.amount_pence)}</p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">No automated total — we&apos;ll quote when you get in touch.</p>
              )}
            </div>
            {result.suggested_package_label ? (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Suggested fit:</span> {result.suggested_package_label}
              </p>
            ) : null}
            {result.pricing_rule_name ? (
              <p className="text-xs text-muted-foreground">Rule: {result.pricing_rule_name}</p>
            ) : null}
            {result.subscription_plan ? (
              <div className="rounded-lg border border-border/70 bg-background/80 px-3 py-3 text-sm">
                <p className="font-medium">{result.subscription_plan.name}</p>
                <p className="mt-1 text-muted-foreground">
                  {formatGBP(result.subscription_plan.price_amount_minor)}{" "}
                  <span className="text-foreground/80">{publicBillingCadence(result.subscription_plan.billing_interval)}</span>
                </p>
              </div>
            ) : null}
            {result.overage_note ? <p className="text-xs text-muted-foreground">{result.overage_note}</p> : null}
            {result.visit_note ? <p className="text-xs text-muted-foreground">{result.visit_note}</p> : null}
            <p className="text-xs text-muted-foreground">{result.disclaimer}</p>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:flex-wrap">
              <Button asChild className="h-11 rounded-lg">
                <Link href={bookHref}>
                  Book a collection <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-lg">
                <Link href="/contact">Request a bespoke quote</Link>
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
