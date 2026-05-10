"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AlertTriangle, Loader2, PiggyBank, RefreshCw } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { CashPositionReportResponseSchema } from "@/lib/api/admin-cash-position-report-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";

import { useBackendMe } from "@/hooks/use-backend-me";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

function buildQs(params: Record<string, string>): string {
  const u = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== "") u.set(k, v);
  });
  const s = u.toString();
  return s ? `?${s}` : "";
}

function poundsFromPence(pence: unknown): string {
  if (typeof pence !== "number" || !Number.isFinite(pence)) return "";
  return (pence / 100).toFixed(2);
}

function penceFromPoundsInput(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number.parseFloat(t.replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function KpiCard(props: { title: string; value: string; hint?: string }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-row items-baseline justify-between gap-3">
          <h3 className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground">{props.title}</h3>
          <p className="shrink-0 text-right text-xl font-semibold tabular-nums tracking-tight sm:text-2xl">{props.value}</p>
        </div>
        {props.hint ? <p className="mt-2 text-xs leading-snug text-muted-foreground">{props.hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export default function AdminCashPositionReportPage() {
  const admin = useAdminApi();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: meData } = useBackendMe();
  const permissions = useMemo(() => new Set(meData?.data?.permissions ?? []), [meData?.data?.permissions]);
  const mayEditAssumptions = permissions.has("costs.manage");

  const dateFrom = searchParams.get("date_from") ?? "";
  const dateTo = searchParams.get("date_to") ?? "";

  const setFilter = useCallback(
    (patch: Record<string, string>) => {
      const p = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([k, v]) => {
        if (v === "") p.delete(k);
        else p.set(k, v);
      });
      router.push(`${pathname}?${p.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const reportQs = useMemo(() => {
    const params: Record<string, string> = {};
    if (dateFrom !== "") params.date_from = dateFrom;
    if (dateTo !== "") params.date_to = dateTo;
    return buildQs(params);
  }, [dateFrom, dateTo]);

  const reportQuery = useQuery({
    queryKey: ["admin", "reports", "cash-position", reportQs],
    queryFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/reports/cash-position${reportQs}`);
      if (!res.ok) throw new Error(res.message);
      const parsed = CashPositionReportResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected cash position payload shape.");
      return parsed.data.data;
    },
  });

  const cp = reportQuery.data?.cash_position as Record<string, unknown> | undefined;
  const assumptionsRemote = reportQuery.data?.assumptions as Record<string, unknown> | undefined;

  const [startingCapitalGbp, setStartingCapitalGbp] = useState("");
  const [routeRegularGbp, setRouteRegularGbp] = useState("");
  const [trialGbp, setTrialGbp] = useState("");
  const [routeDaysPerWeek, setRouteDaysPerWeek] = useState("");
  const [bufferThresholdGbp, setBufferThresholdGbp] = useState("");
  const [conversionTargetGbp, setConversionTargetGbp] = useState("");
  const [secondMachineGbp, setSecondMachineGbp] = useState("");
  const [vanAssessmentGbp, setVanAssessmentGbp] = useState("");

  useEffect(() => {
    if (!assumptionsRemote) return;
    setStartingCapitalGbp(poundsFromPence(assumptionsRemote.starting_capital_pence));
    setRouteRegularGbp(poundsFromPence(assumptionsRemote.regular_route_price_per_knife_pence));
    setTrialGbp(poundsFromPence(assumptionsRemote.trial_price_per_knife_pence));
    setRouteDaysPerWeek(
      assumptionsRemote.route_days_per_week != null && String(assumptionsRemote.route_days_per_week).trim() !== ""
        ? String(assumptionsRemote.route_days_per_week)
        : "",
    );
    setBufferThresholdGbp(poundsFromPence(assumptionsRemote.buffer_warning_threshold_pence));
    setConversionTargetGbp(poundsFromPence(assumptionsRemote.conversion_target_price_pence));
    setSecondMachineGbp(poundsFromPence(assumptionsRemote.second_machine_trigger_pence));
    setVanAssessmentGbp(poundsFromPence(assumptionsRemote.van_assessment_trigger_pence));
  }, [assumptionsRemote]);

  const saveAssumptions = useMutation({
    mutationFn: async () => {
      const body: Record<string, number | string | null> = {};
      const sc = penceFromPoundsInput(startingCapitalGbp);
      const rr = penceFromPoundsInput(routeRegularGbp);
      const tr = penceFromPoundsInput(trialGbp);
      const bt = penceFromPoundsInput(bufferThresholdGbp);
      const ct = penceFromPoundsInput(conversionTargetGbp);
      const sm = penceFromPoundsInput(secondMachineGbp);
      const va = penceFromPoundsInput(vanAssessmentGbp);

      body.starting_capital_pence = sc;
      body.regular_route_price_per_knife_pence = rr;
      body.trial_price_per_knife_pence = tr;
      body.buffer_warning_threshold_pence = bt;
      body.conversion_target_price_pence = ct;
      body.second_machine_trigger_pence = sm;
      body.van_assessment_trigger_pence = va;

      const rd = routeDaysPerWeek.trim();
      if (rd === "") body.route_days_per_week = null;
      else {
        const n = Number.parseFloat(rd);
        if (!Number.isFinite(n)) throw new Error("Route days per week must be a number.");
        body.route_days_per_week = n;
      }

      const res = await admin.json<unknown>("/api/admin/reports/cash-position/assumptions", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Assumptions saved.");
      await queryClient.invalidateQueries({ queryKey: ["admin", "reports", "cash-position"] });
    },
    onError: (e: Error) => {
      toast.error(e.message || "Could not save assumptions.");
    },
  });

  const warnings = reportQuery.data?.warnings ?? [];

  const prof = reportQuery.data?.profitability_context as Record<string, unknown> | undefined;
  const recurringSnap = prof?.recurring_revenue_snapshot as Record<string, unknown> | undefined;
  const mrrBlock = recurringSnap?.mrr as Record<string, unknown> | undefined;

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      <Breadcrumbs
        homeHref="/admin/dashboard"
        items={[
          { label: "Reporting hub", href: "/admin/reporting" },
          { label: "Cash position" },
        ]}
      />
      <PageHeader
        title="Cash position"
        description="Live buffer from starting capital and purchased one-time spend; burn from recurring commitments; optional period profitability context."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void reportQuery.refetch()} disabled={reportQuery.isFetching}>
              {reportQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
              <span className="sr-only sm:not-sr-only sm:ml-2">Refresh</span>
            </Button>
          </div>
        }
      />

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Period filters</CardTitle>
          <CardDescription>Optional range for profitability context only — cash buffer uses catalogue totals (not period-bound).</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="date_from">From</Label>
            <Input
              id="date_from"
              type="date"
              value={dateFrom}
              onChange={(e) => setFilter({ date_from: e.target.value, date_to: dateTo })}
              className="w-[11rem]"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="date_to">To</Label>
            <Input
              id="date_to"
              type="date"
              value={dateTo}
              onChange={(e) => setFilter({ date_from: dateFrom, date_to: e.target.value })}
              className="w-[11rem]"
            />
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => setFilter({ date_from: "", date_to: "" })}>
            Clear dates
          </Button>
        </CardContent>
      </Card>

      {reportQuery.isError ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          <AlertTitle>Could not load report</AlertTitle>
          <AlertDescription>{reportQuery.error instanceof Error ? reportQuery.error.message : "Request failed."}</AlertDescription>
        </Alert>
      ) : null}

      {warnings.length > 0 ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          <AlertTitle>Warnings</AlertTitle>
          <AlertDescription>
            <ul className="list-inside list-disc space-y-1 text-sm">
              {warnings.map((w) => (
                <li key={w.code}>{w.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      {reportQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Loading cash position…
        </div>
      ) : cp ? (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">Cash & pipeline</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <KpiCard title="Starting capital" value={(cp.formatted_starting_capital as string) ?? "—"} hint="Editable assumption." />
              <KpiCard title="Purchased spend (one-time)" value={String(cp.formatted_purchased_spend ?? "")} hint="Sum of purchased one-time rows." />
              <KpiCard title="Live cash buffer" value={(cp.formatted_cash_buffer as string) ?? "—"} hint="Starting capital minus purchased spend." />
              <KpiCard title="Upcoming — to order" value={String(cp.formatted_upcoming_to_order ?? "")} />
              <KpiCard title="Upcoming — pending quote" value={String(cp.formatted_upcoming_pending_quote ?? "")} />
              <KpiCard title="Upcoming — deferred" value={String(cp.formatted_upcoming_deferred ?? "")} />
              <KpiCard title="Total upcoming one-time" value={String(cp.formatted_total_upcoming_one_time ?? "")} />
              <KpiCard
                title="Cash after immediate purchases"
                value={(cp.formatted_cash_after_immediate_purchases as string) ?? "—"}
                hint="Buffer minus total upcoming one-time pipeline."
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">Burn & runway</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <KpiCard title="Weekly running costs" value={String(cp.formatted_weekly_running_costs ?? "")} hint="Monthly fixed ÷ 4.33." />
              <KpiCard title="Monthly fixed costs" value={String(cp.formatted_monthly_fixed_costs ?? "")} hint="Active recurring bucket." />
              <KpiCard title="Pending recurring (monthly equiv.)" value={String(cp.formatted_pending_recurring_monthly_equivalent ?? "")} />
              <KpiCard title="Total monthly burn" value={String(cp.formatted_total_monthly_burn ?? "")} hint="Same as monthly fixed for this report." />
              <KpiCard title="Runway (months)" value={cp.runway_months != null ? String(cp.runway_months) : "—"} />
              <KpiCard title="Runway (weeks)" value={cp.runway_weeks != null ? String(cp.runway_weeks) : "—"} />
            </div>
          </section>

          {prof ? (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">Profitability context (period)</h2>
              <Card className="border-border/80 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Orders, invoices, payments & subscriptions</CardTitle>
                  <CardDescription>
                    Filters: {(reportQuery.data?.filters_applied as { date_from?: string })?.date_from} →{" "}
                    {(reportQuery.data?.filters_applied as { date_to?: string })?.date_to}. Does not change buffer maths.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Paid in period</p>
                    <p className="text-lg font-semibold tabular-nums">{String(prof.formatted_paid_in_period ?? "")}</p>
                    <p className="text-xs text-muted-foreground">{String(prof.payment_count_in_period ?? 0)} payments</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Subscription-tagged payments</p>
                    <p className="text-lg font-semibold tabular-nums">{String(prof.formatted_subscription_tagged_payments_in_period ?? "")}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Invoices issued (period)</p>
                    <p className="text-lg font-semibold tabular-nums">{String(prof.formatted_invoices_issued_in_period ?? "")}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Completed orders</p>
                    <p className="text-lg font-semibold tabular-nums">{String(prof.orders_completed_in_period_count ?? 0)}</p>
                    <p className="text-xs text-muted-foreground">{String(prof.formatted_orders_completed_revenue_in_period ?? "")} revenue</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">MRR snapshot</p>
                    <p className="text-lg font-semibold tabular-nums">{String(mrrBlock?.formatted_gbp ?? "—")}</p>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <p className="text-xs text-muted-foreground">
                      Full subscription split is on the{" "}
                      <Link href="/admin/reports/recurring-revenue" className="font-medium text-primary underline-offset-4 hover:underline">
                        recurring revenue report
                      </Link>
                      .
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>
          ) : null}

          <Card className="border-border/80 shadow-sm">
            <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
              <PiggyBank className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-base">Workbook assumptions</CardTitle>
                <CardDescription>Pricing and threshold knobs are stored for this report and future forecasting work.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!mayEditAssumptions ? (
                <p className="text-sm text-muted-foreground">You can view this report, but only operators with cost catalogue manage permission can edit assumptions.</p>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="starting_capital">Starting capital (£)</Label>
                      <Input id="starting_capital" inputMode="decimal" value={startingCapitalGbp} onChange={(e) => setStartingCapitalGbp(e.target.value)} placeholder="e.g. 1050.00" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="buffer_threshold">Buffer warning threshold (£)</Label>
                      <Input id="buffer_threshold" inputMode="decimal" value={bufferThresholdGbp} onChange={(e) => setBufferThresholdGbp(e.target.value)} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="route_regular">Regular route price / knife (£)</Label>
                      <Input id="route_regular" inputMode="decimal" value={routeRegularGbp} onChange={(e) => setRouteRegularGbp(e.target.value)} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="trial_price">First-visit trial price / knife (£)</Label>
                      <Input id="trial_price" inputMode="decimal" value={trialGbp} onChange={(e) => setTrialGbp(e.target.value)} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="route_days">Route days per week</Label>
                      <Input id="route_days" inputMode="decimal" value={routeDaysPerWeek} onChange={(e) => setRouteDaysPerWeek(e.target.value)} placeholder="e.g. 4" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="conversion_target">Conversion target price (£)</Label>
                      <Input id="conversion_target" inputMode="decimal" value={conversionTargetGbp} onChange={(e) => setConversionTargetGbp(e.target.value)} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="second_machine">Second machine trigger (£)</Label>
                      <Input id="second_machine" inputMode="decimal" value={secondMachineGbp} onChange={(e) => setSecondMachineGbp(e.target.value)} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="van_trigger">Van assessment trigger (£)</Label>
                      <Input id="van_trigger" inputMode="decimal" value={vanAssessmentGbp} onChange={(e) => setVanAssessmentGbp(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={() => void saveAssumptions.mutate()} disabled={saveAssumptions.isPending}>
                      {saveAssumptions.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                          Saving…
                        </>
                      ) : (
                        "Save assumptions"
                      )}
                    </Button>
                  </div>
                </>
              )}
              {assumptionsRemote?.updated_at ? (
                <p className="text-xs text-muted-foreground">Last updated {String(assumptionsRemote.updated_at)}.</p>
              ) : null}
            </CardContent>
          </Card>

          <Separator />

          <details className="rounded-xl border bg-card p-4 text-sm shadow-sm">
            <summary className="cursor-pointer font-medium text-foreground">Definitions</summary>
            <dl className="mt-3 space-y-2 text-muted-foreground">
              {Object.entries((reportQuery.data?.definitions as Record<string, string>) ?? {}).map(([k, v]) => (
                <div key={k}>
                  <dt className="font-medium text-foreground">{k.replace(/_/g, " ")}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </details>
        </>
      ) : null}
    </div>
  );
}
