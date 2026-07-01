"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Loader2, Percent, RefreshCw, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ForecastScenarioDetailResponseSchema } from "@/lib/api/admin-forecast-scenarios-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";

import { useBackendMe } from "@/hooks/use-backend-me";

import { NavBreadcrumbs } from "@/components/layout/NavBreadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

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

function Kpi(props: { label: string; value: string; hint?: string }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-row items-baseline justify-between gap-3">
          <p className="min-w-0 flex-1 text-sm font-medium text-foreground">{props.label}</p>
          <p className="shrink-0 text-right text-lg font-semibold tabular-nums sm:text-xl">{props.value}</p>
        </div>
        {props.hint ? <p className="mt-2 text-xs text-muted-foreground">{props.hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export default function AdminForecastScenarioDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";

  const admin = useAdminApi();
  const queryClient = useQueryClient();
  const { data: meData } = useBackendMe();
  const permissions = useMemo(() => new Set(meData?.data?.permissions ?? []), [meData?.data?.permissions]);
  const mayManage = permissions.has("costs.manage");

  const detailQuery = useQuery({
    queryKey: ["admin", "reports", "forecast-scenarios", id],
    enabled: id !== "",
    queryFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/reports/forecast-scenarios/${id}`);
      if (!res.ok) throw new Error(res.message);
      const parsed = ForecastScenarioDetailResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected forecast scenario detail payload.");
      return parsed.data.data;
    },
  });

  const resolved = detailQuery.data?.forecast as Record<string, unknown> | undefined;
  const inputsResolved = resolved?.inputs_resolved as Record<string, unknown> | undefined;
  const outputs = resolved?.outputs as Record<string, unknown> | undefined;
  const roi = detailQuery.data?.roi_payback as Record<string, unknown> | undefined;
  const scenarioMeta = detailQuery.data?.scenario;

  const [routeDays, setRouteDays] = useState("");
  const [stops, setStops] = useState("");
  const [knives, setKnives] = useState("");
  const [pricePounds, setPricePounds] = useState("");
  const [subCustomers, setSubCustomers] = useState("");
  const [subPricePounds, setSubPricePounds] = useState("");
  const [marketingPounds, setMarketingPounds] = useState("");
  const [salesDriverPounds, setSalesDriverPounds] = useState("");
  const [petrolPounds, setPetrolPounds] = useState("");
  const [consumablePounds, setConsumablePounds] = useState("");

  useEffect(() => {
    if (!inputsResolved) return;
    setRouteDays(String(inputsResolved.route_days_per_week ?? ""));
    setStops(String(inputsResolved.stops_per_route ?? ""));
    setKnives(String(inputsResolved.average_knives_per_stop ?? ""));
    setPricePounds(poundsFromPence(inputsResolved.average_price_per_knife_pence));
    setSubCustomers(String(inputsResolved.subscription_customers ?? ""));
    setSubPricePounds(poundsFromPence(inputsResolved.average_subscription_price_pence));
    setMarketingPounds(poundsFromPence(inputsResolved.marketing_spend_monthly_pence));
    setSalesDriverPounds(poundsFromPence(inputsResolved.sales_driver_cost_monthly_pence));
    setPetrolPounds(poundsFromPence(inputsResolved.petrol_per_route_pence));
    setConsumablePounds(poundsFromPence(inputsResolved.consumable_cost_per_knife_pence));
  }, [inputsResolved]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const rd = Number.parseFloat(routeDays);
      const st = Number.parseFloat(stops);
      const kn = Number.parseFloat(knives);
      const sc = Number.parseInt(subCustomers, 10);
      const body: Record<string, number> = {};
      if (Number.isFinite(rd)) body.route_days_per_week = rd;
      if (Number.isFinite(st)) body.stops_per_route = st;
      if (Number.isFinite(kn)) body.average_knives_per_stop = kn;
      const ap = penceFromPoundsInput(pricePounds);
      const sp = penceFromPoundsInput(subPricePounds);
      const mk = penceFromPoundsInput(marketingPounds);
      const sd = penceFromPoundsInput(salesDriverPounds);
      const pt = penceFromPoundsInput(petrolPounds);
      const ck = penceFromPoundsInput(consumablePounds);
      if (ap !== null) body.average_price_per_knife_pence = ap;
      if (sp !== null) body.average_subscription_price_pence = sp;
      if (mk !== null) body.marketing_spend_monthly_pence = mk;
      if (sd !== null) body.sales_driver_cost_monthly_pence = sd;
      if (pt !== null) body.petrol_per_route_pence = pt;
      if (ck !== null) body.consumable_cost_per_knife_pence = ck;
      if (Number.isFinite(sc) && sc >= 0) body.subscription_customers = sc;

      const res = await admin.json<unknown>(`/api/admin/reports/forecast-scenarios/${id}`, {
        method: "PUT",
        body: JSON.stringify({ inputs: body }),
      });
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Scenario updated.");
      await queryClient.invalidateQueries({ queryKey: ["admin", "reports", "forecast-scenarios", id] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not save."),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/reports/forecast-scenarios/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Scenario deleted.");
      await queryClient.invalidateQueries({ queryKey: ["admin", "reports", "forecast-scenarios"] });
      router.push("/admin/reports/forecast-scenarios");
    },
    onError: (e: Error) => toast.error(e.message || "Could not delete."),
  });

  const isPreset = scenarioMeta?.preset_key != null && scenarioMeta.preset_key !== "";

  const buckets = roi?.buckets as Record<string, Record<string, unknown>> | undefined;
  const portfolio = roi?.portfolio as Record<string, unknown> | undefined;

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      <NavBreadcrumbs
        suffix={[
          { label: "Forecast scenarios", href: "/admin/reports/forecast-scenarios" },
          { label: scenarioMeta?.name ?? "Scenario" },
        ]}
      />

      <PageHeader
        title={scenarioMeta?.name ?? "Forecast scenario"}
        description={detailQuery.data?.disclaimer ?? "Estimate only."}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void detailQuery.refetch()} disabled={detailQuery.isFetching}>
              {detailQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
              <span className="sr-only sm:not-sr-only sm:ml-2">Refresh</span>
            </Button>
            {mayManage && !isPreset ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (window.confirm("Delete this scenario permanently?")) void deleteMutation.mutate();
                }}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                Delete
              </Button>
            ) : null}
          </div>
        }
      />

      {isPreset ? (
        <Alert variant="warning">
          <Percent className="h-4 w-4" aria-hidden />
          <AlertTitle>Preset scenario</AlertTitle>
          <AlertDescription>You can tune drivers; scenario type is locked and this row cannot be deleted.</AlertDescription>
        </Alert>
      ) : null}

      {detailQuery.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading…
        </p>
      ) : detailQuery.isError ? (
        <p className="text-sm text-destructive">{detailQuery.error instanceof Error ? detailQuery.error.message : "Failed."}</p>
      ) : outputs ? (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">Forecast outputs</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Kpi label="Weekly revenue" value={String(outputs.formatted_weekly_revenue ?? "")} />
              <Kpi label="Monthly revenue" value={String(outputs.formatted_monthly_revenue ?? "")} />
              <Kpi label="MRR (subscriptions)" value={String(outputs.formatted_monthly_recurring_revenue ?? "")} hint="Excludes per-stop blade cash." />
              <Kpi label="Gross profit (monthly)" value={String(outputs.formatted_gross_profit ?? "")} />
              <Kpi label="Net profit estimate (monthly)" value={String(outputs.formatted_net_profit_estimate ?? "")} />
              <Kpi label="Monthly costs" value={String(outputs.formatted_monthly_costs ?? "")} />
              <Kpi label="Break-even month #" value={outputs.break_even_month_number != null ? String(outputs.break_even_month_number) : "—"} hint="Cumulative profit horizon." />
              <Kpi label="Cash low point" value={String(outputs.formatted_cash_low_point ?? "")} />
              <Kpi label="Runway (months)" value={outputs.runway_months != null ? String(outputs.runway_months) : "—"} />
              <Kpi label="Knives / month (breakeven)" value={outputs.knives_needed_to_break_even_monthly != null ? String(outputs.knives_needed_to_break_even_monthly) : "—"} />
              <Kpi label="Route-days / week (breakeven)" value={outputs.route_days_per_week_needed_to_break_even != null ? String(outputs.route_days_per_week_needed_to_break_even) : "—"} />
              <Kpi label="Catalogue fixed core / mo" value={formatCatalogueFixed(detailQuery.data?.catalogue_monthly_fixed_core_pence_used)} />
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">ROI & payback (cost catalogue buckets)</h2>
            <p className="text-xs text-muted-foreground">
              Uses imported one-time rows (equipment / startup / marketing families) and recurring commitments. Payback lines reference this scenario’s monthly net estimate — see definitions below.
            </p>
            <div className="grid gap-3 lg:grid-cols-2">
              <Card className="border-border/80 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Portfolio</CardTitle>
                  <CardDescription>Combined purchased capex vs scenario profit.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Row label="Purchased one-time total" value={String(portfolio?.formatted_one_time_purchased_total ?? "—")} />
                  <Row label="Pipeline one-time total" value={String(portfolio?.formatted_one_time_pipeline_total ?? "—")} />
                  <Row label="Simple payback (months)" value={portfolio?.simple_payback_months != null ? String(portfolio.simple_payback_months) : "—"} />
                  <Row label="12 mo ROI multiple vs capex" value={portfolio?.twelve_month_roi_multiple_vs_purchased_capex != null ? String(portfolio.twelve_month_roi_multiple_vs_purchased_capex) : "—"} />
                </CardContent>
              </Card>
              {buckets ? (
                <>
                  <BucketCard title="Equipment" data={buckets.equipment} />
                  <BucketCard title="Startup & admin" data={buckets.startup} />
                  <BucketCard title="Marketing" data={buckets.marketing} />
                  <RecurringCard data={buckets.recurring_commitments} />
                </>
              ) : null}
            </div>
          </section>

          {mayManage ? (
            <>
              <Separator />
              <Card className="border-border/80 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Drivers</CardTitle>
                  <CardDescription>Adjust planning inputs — merged with defaults and saved to this scenario.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <Field label="Route days / week" value={routeDays} onChange={setRouteDays} />
                  <Field label="Stops / route" value={stops} onChange={setStops} />
                  <Field label="Avg knives / stop" value={knives} onChange={setKnives} />
                  <Field label="Avg price / knife (£)" value={pricePounds} onChange={setPricePounds} />
                  <Field label="Subscription customers" value={subCustomers} onChange={setSubCustomers} />
                  <Field label="Avg subscription (£ / mo)" value={subPricePounds} onChange={setSubPricePounds} />
                  <Field label="Marketing (£ / mo)" value={marketingPounds} onChange={setMarketingPounds} />
                  <Field label="Sales & driver (£ / mo)" value={salesDriverPounds} onChange={setSalesDriverPounds} />
                  <Field label="Petrol / route (£)" value={petrolPounds} onChange={setPetrolPounds} />
                  <Field label="Consumable / knife (£)" value={consumablePounds} onChange={setConsumablePounds} />
                  <div className="sm:col-span-2">
                    <Button type="button" onClick={() => void saveMutation.mutate()} disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                      Save drivers
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}

          <details className="rounded-xl border bg-card p-4 text-sm shadow-sm">
            <summary className="cursor-pointer font-medium text-foreground">Forecast definitions</summary>
            <dl className="mt-3 space-y-2 text-muted-foreground">
              {Object.entries((resolved?.definitions as Record<string, string>) ?? {}).map(([k, v]) => (
                <div key={k}>
                  <dt className="font-medium text-foreground">{k.replace(/_/g, " ")}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </details>

          <details className="rounded-xl border bg-card p-4 text-sm shadow-sm">
            <summary className="cursor-pointer font-medium text-foreground">ROI definitions</summary>
            <dl className="mt-3 space-y-2 text-muted-foreground">
              {Object.entries((roi?.definitions as Record<string, string>) ?? {}).map(([k, v]) => (
                <div key={k}>
                  <dt className="font-medium text-foreground">{k.replace(/_/g, " ")}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </details>

          <p className="text-xs text-muted-foreground">
            Need cash buffers? See the{" "}
            <Link href="/admin/reports/cash-position" className="font-medium text-primary underline-offset-4 hover:underline">
              cash position report
            </Link>
            .
          </p>
        </>
      ) : null}
    </div>
  );
}

function formatCatalogueFixed(v: unknown): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  const pounds = v / 100;
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pounds);
}

function Row(props: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/60 py-1 last:border-0">
      <span className="text-muted-foreground">{props.label}</span>
      <span className="font-medium tabular-nums text-foreground">{props.value}</span>
    </div>
  );
}

function BucketCard(props: { title: string; data?: Record<string, unknown> }) {
  if (!props.data) return null;
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{props.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Row label="Purchased one-time" value={String(props.data.formatted_one_time_purchased ?? "—")} />
        <Row label="Pipeline one-time" value={String(props.data.formatted_one_time_pipeline ?? "—")} />
        <Row label="Payback (isolated months)" value={props.data.simple_payback_months_isolated != null ? String(props.data.simple_payback_months_isolated) : "—"} />
        <Row label="12 mo ROI vs bucket capex" value={props.data.twelve_month_roi_multiple_vs_bucket_capex != null ? String(props.data.twelve_month_roi_multiple_vs_bucket_capex) : "—"} />
      </CardContent>
    </Card>
  );
}

function RecurringCard(props: { data?: Record<string, unknown> }) {
  if (!props.data) return null;
  return (
    <Card className="border-border/80 shadow-sm lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Recurring commitments</CardTitle>
        <CardDescription>Live catalogue monthly equivalents (active / pending buckets).</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
        <Row label="Active monthly equivalent" value={String(props.data.formatted_active_monthly_equivalent ?? "—")} />
        <Row label="Pending monthly equivalent" value={String(props.data.formatted_pending_monthly_equivalent ?? "—")} />
        <Row label="Annual active commitment" value={String(props.data.formatted_annual_active_commitment ?? "—")} />
        <Row
          label="Months profit to cover annual recurring"
          value={props.data.months_of_flat_net_profit_to_cover_annual_recurring != null ? String(props.data.months_of_flat_net_profit_to_cover_annual_recurring) : "—"}
        />
      </CardContent>
    </Card>
  );
}

function Field(props: { label: string; value: string; onChange: (v: string) => void }) {
  const fid = props.label.replace(/\s+/g, "_").toLowerCase();
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={fid}>{props.label}</Label>
      <Input id={fid} value={props.value} onChange={(e) => props.onChange(e.target.value)} />
    </div>
  );
}
