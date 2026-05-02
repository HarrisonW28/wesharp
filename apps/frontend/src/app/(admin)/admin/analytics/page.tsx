"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useMemo } from "react";

import {
  AlertCircle,
  Loader2,
  RefreshCw,
  TrendingUp,
  Users as UsersIcon,
} from "lucide-react";
import { useQueries } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import {
  AnalyticsOperationsResponseSchema,
  AnalyticsOverviewResponseSchema,
  AnalyticsRoutesResponseSchema,
  AnalyticsSalesResponseSchema,
} from "@/lib/api/admin-analytics-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { formatGBP } from "@/lib/format/money";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

function buildQs(params: Record<string, string>): string {
  const u = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== "") {
      u.set(k, v);
    }
  });
  const s = u.toString();
  return s ? `?${s}` : "";
}

function formatRechartsRevenuePence(value: unknown): string {
  const pence = typeof value === "number" ? value : Number(value);
  return formatGBP(Number.isFinite(pence) ? pence : 0);
}

/** Server-computed GBP display only — totals come only from KPI payload. */
function InsightCard(props: {
  title: string;
  description?: string;
  value: ReactNode;
  footnote?: string;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{props.title}</CardTitle>
        {props.description ? <CardDescription className="text-xs">{props.description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums tracking-tight">{props.value}</p>
        {props.footnote ? <p className="mt-2 text-xs text-muted-foreground">{props.footnote}</p> : null}
      </CardContent>
    </Card>
  );
}

function ChartShell(props: { title: string; description?: string; children: ReactNode; empty?: boolean }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base">{props.title}</CardTitle>
        {props.description ? <CardDescription className="text-xs">{props.description}</CardDescription> : null}
      </CardHeader>
      <Separator />
      <CardContent className="min-h-[280px] w-full pb-6 pt-4">
        {props.empty ? <p className="text-sm text-muted-foreground">No data in this filter window.</p> : props.children}
      </CardContent>
    </Card>
  );
}

export default function AdminAnalyticsPage() {
  const admin = useAdminApi();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const p = new URLSearchParams(searchParams.toString());
    let changed = false;
    const setIfMissing = (key: string, value: string) => {
      if (!p.has(key)) {
        p.set(key, value);
        changed = true;
      }
    };
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 90);
    setIfMissing("date_to", to.toISOString().slice(0, 10));
    setIfMissing("date_from", from.toISOString().slice(0, 10));
    if (changed) {
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    }
  }, [pathname, router, searchParams]);

  const qp = searchParams.toString();

  const qKey = ["admin-analytics", qp] as const;

  const qs = qp ? `?${qp}` : "";

  const [overviewQuery, salesQuery, routesQuery, operationsQuery] = useQueries({
    queries: [
      {
        queryKey: [...qKey, "overview"],
        queryFn: async () => {
          const res = await admin.json<unknown>(`/api/admin/analytics/overview${qs}`);
          if (!res.ok) throw Object.assign(new Error(res.message), { status: res.status });
          const parsed = AnalyticsOverviewResponseSchema.safeParse(res.data);
          if (!parsed.success) throw new Error("Analytics overview payload mismatched.");
          return parsed.data.data;
        },
        retry: 1,
      },
      {
        queryKey: [...qKey, "sales"],
        queryFn: async () => {
          const res = await admin.json<unknown>(`/api/admin/analytics/sales${qs}`);
          if (!res.ok) throw Object.assign(new Error(res.message), { status: res.status });
          const parsed = AnalyticsSalesResponseSchema.safeParse(res.data);
          if (!parsed.success) throw new Error("Analytics sales payload mismatched.");
          return parsed.data.data;
        },
        retry: 1,
      },
      {
        queryKey: [...qKey, "routes"],
        queryFn: async () => {
          const res = await admin.json<unknown>(`/api/admin/analytics/routes${qs}`);
          if (!res.ok) throw Object.assign(new Error(res.message), { status: res.status });
          const parsed = AnalyticsRoutesResponseSchema.safeParse(res.data);
          if (!parsed.success) throw new Error("Analytics routes payload mismatched.");
          return parsed.data.data;
        },
        retry: 1,
      },
      {
        queryKey: [...qKey, "operations"],
        queryFn: async () => {
          const res = await admin.json<unknown>(`/api/admin/analytics/operations${qs}`);
          if (!res.ok) throw Object.assign(new Error(res.message), { status: res.status });
          const parsed = AnalyticsOperationsResponseSchema.safeParse(res.data);
          if (!parsed.success) throw new Error("Analytics operations payload mismatched.");
          return parsed.data.data;
        },
        retry: 1,
      },
    ],
  });

  const overview = overviewQuery.data;
  const sales = salesQuery.data;
  const routes = routesQuery.data;
  const ops = operationsQuery.data;

  const kpis = overview?.kpis;

  const isLoading =
    overviewQuery.isLoading || salesQuery.isLoading || routesQuery.isLoading || operationsQuery.isLoading;
  const isError =
    overviewQuery.isError || salesQuery.isError || routesQuery.isError || operationsQuery.isError;
  const errorMessage = isError
    ? ((overviewQuery.error ?? salesQuery.error ?? routesQuery.error ?? operationsQuery.error) as Error | null)
    : null;

  const filters = overview?.distinct_cities ?? [];

  const onApplyFilters = () => {
    router.refresh();
    void overviewQuery.refetch();
    void salesQuery.refetch();
    void routesQuery.refetch();
    void operationsQuery.refetch();
  };

  const pieInvoice = useMemo(() => {
    if (!sales) {
      return [] as { label: string; value: number }[];
    }
    return [
      {
        label: "Paid billing (in-window)",
        value: Math.max(0, sales.paid_vs_open_invoices.paid_full.billed_amount_pence),
      },
      {
        label: "Open residual",
        value: Math.max(0, sales.paid_vs_open_invoices.open_residual.balance_pence),
      },
    ];
  }, [sales]);


type ErrWithStatus = Error & { status?: number };

  const first403 = [overviewQuery, salesQuery, routesQuery, operationsQuery].find(
    (q) => q.isError && (q.error as ErrWithStatus | undefined)?.status === 403,
  );

  if (first403) {
    return (
      <div className="space-y-8">
        <Breadcrumbs crumbs={[{ label: "Operations", href: "/admin/dashboard" }, { label: "Analytics" }]} />
        <PageHeader
          title="Analytics"
          description="Requires analytics.view on your staff profile."
        />
        <Card>
          <CardContent className="flex items-center gap-3 py-6 text-sm">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span>You do not have permission to view analytics dashboards.</span>
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="space-y-10">
      <Breadcrumbs crumbs={[{ label: "Operations", href: "/admin/dashboard" }, { label: "Analytics" }]} />
      <PageHeader
        title="Analytics"
        description="Throughput, revenue and route performance totals are computed on the server only."
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => void onApplyFilters()} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        }
      />

      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>
            Date range and city apply to <span className="font-medium">invoice accrual</span> and{" "}
            <span className="font-medium">completed-order</span> KPIs below. Rolling week/month revenue cards still use calendar
            week/month (UTC), filtered by city only.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="grid gap-2">
            <Label htmlFor="date_from">From</Label>
            <Input id="date_from" type="date" defaultValue={searchParams.get("date_from") ?? ""} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="date_to">To</Label>
            <Input id="date_to" type="date" defaultValue={searchParams.get("date_to") ?? ""} />
          </div>
          <div className="grid min-w-[200px] flex-1 gap-2">
            <Label htmlFor="city">City</Label>
            <select
              id="city"
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-offset-2"
              defaultValue={searchParams.get("city") ?? ""}
              aria-label="Filter by coverage or company city"
            >
              <option value="">All cities</option>
              {filters.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            onClick={() => {
              const fd = document.getElementById("date_from") as HTMLInputElement | null;
              const td = document.getElementById("date_to") as HTMLInputElement | null;
              const ct = document.getElementById("city") as HTMLSelectElement | null;
              router.push(`/admin/analytics${buildQs({ date_from: fd?.value ?? "", date_to: td?.value ?? "", city: ct?.value ?? "" })}`);
            }}
          >
            Apply
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading analytics…
        </div>
      ) : null}

      {isError && errorMessage instanceof Error ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4 text-sm">
            <span className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" /> {errorMessage.message}
            </span>
            <Button type="button" variant="outline" size="sm" onClick={() => void onApplyFilters()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && kpis ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InsightCard
            title="Revenue this calendar month"
            description="Recognised revenue from orders marked completed."
            value={formatGBP(kpis.revenue_this_month_pence)}
            footnote={`Server KPI · ${overview?.basis?.revenue ?? "orders.updated_at at completion."}`}
          />
          <InsightCard
            title="Revenue this ISO week"
            description="Rolling Monday–Sunday (UTC)."
            value={formatGBP(kpis.revenue_this_week_pence)}
          />
          <InsightCard
            title="Knives sharpened this week"
            description="Workshop-complete blade states this week."
            value={kpis.knives_sharpened_this_week.toLocaleString("en-GB")}
          />
          <InsightCard
            title="Average price per blade"
            description="Across completed orders inside the filtered date span."
            value={formatGBP(kpis.average_price_per_knife_pence)}
          />
          <InsightCard
            title="Active customers"
            description="Trial / active / at-risk accounts matching city scope."
            value={kpis.active_customers.toLocaleString("en-GB")}
          />
          <InsightCard title="Outstanding invoices" description="Unsettled billed documents." value={`${kpis.outstanding_invoice_count}`} />
          <InsightCard
            title="Outstanding balance"
            value={formatGBP(kpis.outstanding_invoice_amount_pence)}
            footnote="Invoice totals minus summed posted payments."
          />
          <InsightCard
            title="Overdue exposure"
            value={formatGBP(kpis.overdue_amount_pence)}
            footnote={overview?.basis?.invoice_balances ?? "Past due or overdue status unpaid portion."}
          />
          <InsightCard
            title="New bookings this week"
            value={kpis.new_bookings_this_week.toLocaleString("en-GB")}
            footnote={"Bookings.created_at filtered by filters city."}
          />
        </section>
      ) : null}

      {!isLoading && kpis ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Finance &amp; throughput · filter dates</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InsightCard
              title="Invoiced · subscription flagged"
              description={`issued_on ${overview?.filters?.date_from ?? ""} → ${overview?.filters?.date_to ?? ""}`}
              value={formatGBP(kpis.invoiced_subscription_total_pence_in_range)}
              footnote={overview?.basis?.invoiced_split ?? "is_subscription_billing = true on issued invoices."}
            />
            <InsightCard
              title="Invoiced · one-off"
              description="Same date window · totals"
              value={formatGBP(kpis.invoiced_one_off_total_pence_in_range)}
              footnote="All other issued invoices in scope (not void/draft)."
            />
            <InsightCard
              title="Line revenue · subscription items"
              description="Sum of subscription-type lines"
              value={formatGBP(kpis.invoiced_subscription_line_pence_in_range)}
              footnote={overview?.basis?.invoice_lines ?? "invoice line_item_type = subscription."}
            />
            <InsightCard
              title="Line revenue · overage"
              description="Usage beyond allowance (lines)"
              value={formatGBP(kpis.invoiced_overage_line_pence_in_range)}
              footnote="invoice line_item_type = overage."
            />
            <InsightCard
              title="Completed orders (range)"
              description="orders.updated_at in filter"
              value={kpis.completed_orders_in_filter_range.toLocaleString("en-GB")}
              footnote={overview?.basis?.completed_orders_filter ?? ""}
            />
            <InsightCard
              title="Avg knives / completed order"
              description="In filter date span"
              value={
                kpis.average_knives_per_completed_order_in_range != null
                  ? kpis.average_knives_per_completed_order_in_range.toLocaleString("en-GB", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })
                  : "—"
              }
              footnote="Null when no completed orders in range."
            />
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartShell
          title="Revenue over time"
          description={"Completed-order revenue summed per UTC day"}
          empty={!sales?.revenue_daily?.length}
        >
          <div className="h-[260px] w-full">
            {!sales?.revenue_daily?.length ? null : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sales.revenue_daily}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis
                    tickFormatter={(v) =>
                      `${(typeof v === "number" ? v / 100 : Number(v) / 100).toLocaleString("en-GB", { notation: "compact", style: "currency", currency: "GBP", maximumFractionDigits: 1 })}`
                    }
                  />
                  <RechartsTooltip formatter={(val) => formatRechartsRevenuePence(val)} />
                  <Area type="monotone" dataKey="revenue_pence" name="Revenue (£)" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / .15)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartShell>

        <ChartShell title="Knives sharpened by week" empty={!ops?.knives_sharpened_by_week?.length}>
          <div className="h-[260px] w-full">
            {ops?.knives_sharpened_by_week.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ops.knives_sharpened_by_week}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} angle={-20} height={72} interval={0} />
                  <YAxis />
                  <RechartsTooltip formatter={(value) => (typeof value === "number" ? value : Number(value))} />
                  <Bar dataKey="knife_count" name="Knives" fill="hsl(var(--chart-4, 217 91% 60%))" />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </ChartShell>

        <ChartShell title="Revenue by city" empty={!sales?.revenue_by_city?.length}>
          <div className="h-[280px] w-full">
            {sales?.revenue_by_city.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sales.revenue_by_city.slice(0, 12)} layout="vertical" margin={{ left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="city" width={120} tick={{ fontSize: 11 }} />
                  <RechartsTooltip formatter={(val) => formatRechartsRevenuePence(val)} />
                  <Bar dataKey="revenue_pence" fill="hsl(var(--primary))" name="Completed orders" radius={[4, 4, 4, 4]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </ChartShell>

        <ChartShell title="Bookings created by status" empty={!ops?.bookings_by_status?.length}>
          <div className="h-[260px] w-full">
            {ops?.bookings_by_status.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ops.bookings_by_status}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Bar dataKey="count" fill="hsl(var(--chart-5, 283 71% 60%))" name="Bookings" />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </ChartShell>

        <ChartShell title="Route-attributed revenue by city" description="Completed orders wired to fleet coverage_city" empty={!routes?.route_value_by_city?.length}>
          <div className="h-[280px] w-full">
            {routes?.route_value_by_city.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={routes.route_value_by_city} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="city" width={120} />
                  <RechartsTooltip formatter={(val) => formatRechartsRevenuePence(val)} />
                  <Bar dataKey="revenue_pence" fill="hsl(var(--muted-foreground) / .4)" radius={[4, 4, 4, 4]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </ChartShell>

        <ChartShell title="Top customers by recognised spend" empty={!sales?.top_customers_by_spend?.length}>
          <div className="overflow-x-auto">
            {!sales?.top_customers_by_spend?.length ? null : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 font-medium">Customer</th>
                    <th className="py-2 font-medium">City</th>
                    <th className="py-2 text-right font-medium">Recognised (£)</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.top_customers_by_spend.map((row) => (
                    <tr key={row.company_id} className="border-b border-border/60">
                      <td className="py-2 font-medium">{row.company_name}</td>
                      <td className="py-2 text-muted-foreground">{row.city ?? "—"}</td>
                      <td className="py-2 text-right tabular-nums">{formatGBP(row.revenue_pence)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            Use <TrendingUp className="mr-1 inline h-4 w-4" /> recognises completed orders attributed to billing company.
          </div>
        </ChartShell>

        <ChartShell title="Paid vs open invoice balances" empty={sales === undefined}>
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="relative h-[220px] flex-1">
              {!sales ? null : pieInvoice.every((x) => x.value === 0) ? (
                <p className="text-muted-foreground">No invoicing activity captured in-period.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie dataKey="value" data={pieInvoice} innerRadius={50} outerRadius={80} paddingAngle={2} nameKey="label">
                      {pieInvoice.map((_, idx) => (
                        <Cell key={idx} fill={idx === 0 ? "hsl(var(--primary))" : "hsl(var(--muted) / .7)"} />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            {sales ? (
              <div className="flex flex-1 flex-col justify-center space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <UsersIcon className="mt-1 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Paid in-window</p>
                    <p className="text-muted-foreground">
                      Invoices counted at creation ({sales.paid_vs_open_invoices.paid_full.invoice_count}), billed totals{" "}
                      {formatGBP(sales.paid_vs_open_invoices.paid_full.billed_amount_pence)} — server-labelled paid.
                    </p>
                  </div>
                </div>
                <div>
                  <p className="font-medium">Open residual balance</p>
                  <p className="text-muted-foreground">
                    Outstanding docs in window with residual {formatGBP(sales.paid_vs_open_invoices.open_residual.balance_pence)}{" "}
                    across {sales.paid_vs_open_invoices.open_residual.invoice_count} rows.
                  </p>
                  <Link className="text-primary mt-3 inline-flex text-xs underline underline-offset-2" href="/admin/invoices">
                    Review invoices console
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </ChartShell>
      </div>
    </div>
  );
}
