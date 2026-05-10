"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";

import { AlertCircle, Info, Loader2, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { FinanceDashboardResponseSchema } from "@/lib/api/admin-finance-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { formatGBP } from "@/lib/format/money";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReportCsvExportButton } from "@/components/reports/ReportCsvExportButton";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CompanyOpt = { id: string; name: string; city?: string | null };

function formatPenceTick(value: unknown): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "—";
  return formatGBP(n);
}

function truncateChartLabel(s: string, max = 26): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function buildQs(params: Record<string, string>): string {
  const u = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== "") u.set(k, v);
  });
  const s = u.toString();
  return s ? `?${s}` : "";
}

function KpiCard(props: { title: string; value: string; hint?: string }) {
  return (
    <Card className="min-h-[120px] shadow-sm">
      <CardHeader className="pb-1">
        <CardTitle className="text-base font-medium text-muted-foreground">{props.title}</CardTitle>
        {props.hint ? <CardDescription className="text-sm">{props.hint}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">{props.value}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminFinanceDashboardPage() {
  const admin = useAdminApi();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const dateFrom = searchParams.get("date_from") ?? "";
  const dateTo = searchParams.get("date_to") ?? "";
  const companyId = searchParams.get("company_id") ?? "";
  const invoiceStatus = searchParams.get("invoice_status") ?? "";

  const setFilter = useCallback(
    (patch: Record<string, string>) => {
      const p = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([k, v]) => {
        if (v === "") p.delete(k);
        else p.set(k, v);
      });
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const dashboardQs = useMemo(
    () =>
      buildQs({
        date_from: dateFrom,
        date_to: dateTo,
        company_id: companyId,
        invoice_status: invoiceStatus,
      }),
    [companyId, dateFrom, dateTo, invoiceStatus],
  );

  const subscriptionsExportQs = useMemo(() => buildQs({ company_id: companyId }), [companyId]);

  const dashboardQuery = useQuery({
    queryKey: ["admin-finance-dashboard", dashboardQs],
    queryFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/finance/dashboard${dashboardQs}`);
      if (!res.ok) throw new Error(res.message);
      const parsed = FinanceDashboardResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected finance dashboard payload.");
      return parsed.data.data;
    },
  });

  const companiesQuery = useQuery({
    queryKey: ["admin-lookups-companies-finance"],
    queryFn: async () => {
      const res = await admin.json<unknown>("/api/admin/lookups/companies");
      if (!res.ok) throw new Error(res.message);
      const items = (res.data as { data?: { items?: CompanyOpt[] } })?.data?.items;
      return Array.isArray(items) ? items : [];
    },
  });

  useEffect(() => {
    if (dashboardQuery.isError) toast.error((dashboardQuery.error as Error).message);
  }, [dashboardQuery.error, dashboardQuery.isError]);

  const data = dashboardQuery.data;
  const rr = data?.recurring_revenue;
  const defaultPeriodHint = data?.period
    ? `${data.period.date_from} → ${data.period.date_to} (${data.period.timezone})`
    : undefined;

  const invoicedSplitChart =
    !rr || rr.revenue_invoiced_period_pence.total <= 0
      ? []
      : [
          { name: "Subscription-tagged invoiced", pence: rr.revenue_invoiced_period_pence.subscription_tagged },
          { name: "One-off invoiced", pence: rr.revenue_invoiced_period_pence.one_off },
        ];
  const paymentsSplitChart =
    !rr || rr.revenue_payments_period_pence.total <= 0
      ? []
      : [
          { name: "Subscription-tagged cash", pence: rr.revenue_payments_period_pence.subscription_tagged },
          { name: "One-off cash", pence: rr.revenue_payments_period_pence.one_off },
        ];

  const SPLIT_COLORS = ["hsl(var(--primary))", "hsl(142 76% 36%)"];
  const BAR_SERIES_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

  const invoicePipelineData = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Draft", count: data.kpis.draft_invoice_count },
      { label: "Unpaid", count: data.kpis.unpaid_invoice_count },
      { label: "Overdue", count: data.kpis.overdue_invoice_count },
      { label: "Voids (period)", count: data.kpis.void_invoice_count_period },
    ];
  }, [data]);

  const invoicePipelineTotal = useMemo(() => invoicePipelineData.reduce((s, r) => s + r.count, 0), [invoicePipelineData]);

  const arVsPaidData = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Outstanding", pence: data.kpis.outstanding_pence },
      { label: "Paid (period)", pence: data.kpis.paid_in_period_pence },
    ];
  }, [data]);

  const costRunRateData = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Active", pence: data.cost_commitments.monthly_equivalent_active_pence },
      { label: "Pending", pence: data.cost_commitments.monthly_equivalent_pending_pence },
    ];
  }, [data]);

  const consumablesStockData = useMemo(() => {
    if (!data || data.consumables_inventory.active_skus <= 0) return [];
    const low = data.consumables_inventory.low_stock_count;
    const active = data.consumables_inventory.active_skus;
    return [
      { name: "Low stock SKUs", count: low },
      { name: "Above threshold", count: Math.max(0, active - low) },
    ];
  }, [data]);

  const subscriptionVolumeData = useMemo(() => {
    if (!rr) return [];
    return [
      { label: "Active", count: rr.subscription_counts.active },
      { label: "Cancelled (snap.)", count: rr.subscription_counts.cancelled_snapshot },
      { label: "New (period)", count: rr.subscription_counts.new_in_period },
      { label: "Cancelled (period)", count: rr.subscription_counts.cancelled_in_period },
    ];
  }, [rr]);

  const topOutstandingChartData = useMemo(() => {
    if (!data) return [];
    return data.top_outstanding_companies.slice(0, 12).map((row) => ({
      label: truncateChartLabel(row.company_name ?? row.company_id),
      pence: row.outstanding_pence,
    }));
  }, [data]);

  const topSubscriptionCustomersChartData = useMemo(() => {
    if (!rr) return [];
    return rr.top_subscription_customers.slice(0, 10).map((row) => ({
      label: truncateChartLabel(row.company_name ?? row.company_id),
      pence: row.subscription_invoiced_pence,
    }));
  }, [rr]);

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Finance", href: "/admin/finance" },
        ]}
      />
      <PageHeader
        title="Finance dashboard"
        description="Billing KPIs, overdue AR, and recent cash — amounts in GBP from the server."
        actions={
          <div className="flex flex-wrap gap-2">
            <ReportCsvExportButton
              admin={admin}
              exportPath={`/api/admin/reports/exports/subscriptions.csv${subscriptionsExportQs}`}
              label="Export subscriptions (CSV)"
              variant="secondary"
            />
            <Button asChild variant="outline" className="text-base">
              <Link href="/admin/reports/sales">Sales &amp; revenue report</Link>
            </Button>
            <Button asChild variant="outline" className="text-base">
              <Link href="/admin/reports/billing">Invoice &amp; payment report</Link>
            </Button>
          </div>
        }
      />

      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription className="text-base">Refine metrics and lists. Outstanding figures follow filter; paid totals use the date range.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="fin-from" className="text-base">
              Period from
            </Label>
            <Input
              id="fin-from"
              type="date"
              className="h-11 text-base"
              value={dateFrom}
              onChange={(e) => setFilter({ date_from: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fin-to" className="text-base">
              Period to
            </Label>
            <Input
              id="fin-to"
              type="date"
              className="h-11 text-base"
              value={dateTo}
              onChange={(e) => setFilter({ date_to: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-base">Company</Label>
            <Select
              value={companyId || "__all__"}
              onValueChange={(v) => setFilter({ company_id: v === "__all__" ? "" : v })}
            >
              <SelectTrigger className="h-11 text-base">
                <SelectValue placeholder="All companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-base">
                  All companies
                </SelectItem>
                {(companiesQuery.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-base">
                    {c.name}
                    {c.city ? ` · ${c.city}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-base">Invoice status</Label>
            <Select value={invoiceStatus || "__all__"} onValueChange={(v) => setFilter({ invoice_status: v === "__all__" ? "" : v })}>
              <SelectTrigger className="h-11 text-base">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-base">
                  All statuses
                </SelectItem>
                {(["draft", "sent", "overdue", "paid", "void"] as const).map((s) => (
                  <SelectItem key={s} value={s} className="text-base">
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-end gap-2 md:col-span-2 lg:col-span-4">
            <Button
              type="button"
              variant="outline"
              className="text-base"
              onClick={() => {
                setFilter({ date_from: "", date_to: "", company_id: "", invoice_status: "" });
              }}
            >
              Clear filters
            </Button>
            <Button type="button" variant="secondary" className="text-base" onClick={() => void dashboardQuery.refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {dashboardQuery.isPending ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border bg-card text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin" aria-hidden />
          <p className="text-base">Loading finance metrics…</p>
        </div>
      ) : dashboardQuery.isError ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" aria-hidden />
          <p className="text-base text-destructive">{(dashboardQuery.error as Error).message}</p>
          <Button type="button" onClick={() => void dashboardQuery.refetch()}>
            Retry
          </Button>
        </div>
      ) : data ? (
        <>
          {data.kpis_note ? <p className="text-base text-muted-foreground">{data.kpis_note}</p> : null}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <KpiCard title="Outstanding balance" value={data.kpis.formatted_outstanding} hint="Open AR (snapshot)" />
            <KpiCard title="Unpaid invoices" value={String(data.kpis.unpaid_invoice_count)} hint="Issued, balance &gt; 0" />
            <KpiCard title="Overdue invoices" value={String(data.kpis.overdue_invoice_count)} hint="Past due date" />
            <KpiCard title="Draft invoices" value={String(data.kpis.draft_invoice_count)} hint="Need review / issue" />
            <KpiCard title="Voids (period)" value={String(data.kpis.void_invoice_count_period)} hint="Void activity in range" />
            <KpiCard title="Paid in period" value={data.kpis.formatted_paid_in_period} hint={defaultPeriodHint} />
            <KpiCard
              title="Payments in period"
              value={String(data.kpis.payment_count_in_period)}
              hint="Cash / recorded rows"
            />
            <KpiCard
              title="Subscription-tagged payments"
              value={data.kpis.formatted_subscription_tagged_payments_in_period}
              hint="Real payments on subscription-flagged invoices (not MRR model)"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Invoice pipeline</CardTitle>
                <CardDescription className="text-xs">
                  Counts from KPI snapshot — voids are limited to activity in the selected period.
                </CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="h-[280px] w-full pt-4 pb-2 sm:h-[300px]">
                {invoicePipelineTotal === 0 ? (
                  <p className="text-sm text-muted-foreground">No draft, unpaid, overdue, or period void rows for this filter.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={invoicePipelineData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-14} height={52} textAnchor="end" />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={36} />
                      <RechartsTooltip formatter={(val) => [`${val} invoices`, "Count"]} />
                      <Bar dataKey="count" name="Invoices" radius={[4, 4, 0, 0]}>
                        {invoicePipelineData.map((_, i) => (
                          <Cell key={i} fill={BAR_SERIES_COLORS[i % BAR_SERIES_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Open AR vs cash in period</CardTitle>
                <CardDescription className="text-xs">
                  Outstanding is a filtered snapshot; paid total sums payments with paid_at in the date range.
                </CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="h-[280px] w-full pt-4 pb-2 sm:h-[300px]">
                {!data.kpis.outstanding_pence && !data.kpis.paid_in_period_pence ? (
                  <p className="text-sm text-muted-foreground">Nothing to compare for this filter.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={arVsPaidData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={formatPenceTick} width={72} />
                      <RechartsTooltip formatter={(val) => formatPenceTick(val)} />
                      <Bar dataKey="pence" name="Amount" radius={[4, 4, 0, 0]}>
                        <Cell fill="var(--chart-1)" />
                        <Cell fill="var(--chart-2)" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-muted shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Internal recurring cost commitments</CardTitle>
              <CardDescription className="text-base">
                Cost catalogue rows with recurring cadence (imports and manual). Weekly lines use a 4.33× factor for monthly equivalents.
                Active vs pending follows API status buckets.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                  title="Monthly equivalent (active)"
                  value={data.cost_commitments.formatted_monthly_equivalent_active}
                  hint={`${data.cost_commitments.active_recurring_count} recurring rows`}
                />
                <KpiCard
                  title="Annual equivalent (active)"
                  value={data.cost_commitments.formatted_annual_equivalent_active}
                  hint="Statuses: active, purchased, reserve"
                />
                <KpiCard
                  title="Monthly equivalent (pending)"
                  value={data.cost_commitments.formatted_monthly_equivalent_pending}
                  hint={`${data.cost_commitments.pending_recurring_count} rows`}
                />
                <KpiCard
                  title="Annual equivalent (pending)"
                  value={data.cost_commitments.formatted_annual_equivalent_pending}
                  hint="To arrange, quotes, deferred, etc."
                />
              </div>
              <Card className="overflow-hidden border bg-muted/15 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Recurring cost run-rate (monthly equivalent)</CardTitle>
                  <CardDescription className="text-xs">Active vs pending catalogue rows — same basis as KPI cards above.</CardDescription>
                </CardHeader>
                <Separator />
                <CardContent className="h-[240px] w-full pt-4 pb-2">
                  {!costRunRateData.some((r) => r.pence > 0) ? (
                    <p className="text-sm text-muted-foreground">No recurring monthly equivalents for this tenant.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={costRunRateData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={formatPenceTick} width={72} />
                        <RechartsTooltip formatter={(val) => formatPenceTick(val)} />
                        <Bar dataKey="pence" radius={[4, 4, 0, 0]}>
                          <Cell fill="hsl(var(--primary))" />
                          <Cell fill="hsl(142 76% 36%)" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
              {data.cost_commitments.upcoming_due.length > 0 ? (
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Next due</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Monthly eq.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.cost_commitments.upcoming_due.map((row) => (
                        <TableRow key={String(row.id)}>
                          <TableCell className="tabular-nums font-medium">{String(row.next_due_on ?? "—")}</TableCell>
                          <TableCell>{String(row.name ?? "")}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {String(row.status ?? "")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {typeof row.formatted_monthly_equivalent === "string"
                              ? row.formatted_monthly_equivalent
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming due dates on recurring cost rows.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-muted shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl">Consumables inventory</CardTitle>
                <CardDescription className="text-base">
                  Workshop spares with stock thresholds — Sprint 23.4. Low-stock lines contribute to projected restock.
                </CardDescription>
              </div>
              <Button asChild variant="outline" className="shrink-0">
                <Link href="/admin/finance/consumables">Open inventory</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <KpiCard title="Active SKUs" value={String(data.consumables_inventory.active_skus)} hint="Inventory-tracked consumables" />
                <KpiCard title="Low stock lines" value={String(data.consumables_inventory.low_stock_count)} hint="At or below reorder threshold" />
                <KpiCard
                  title="Projected restock"
                  value={data.consumables_inventory.formatted_projected_restock}
                  hint="To refill shortfalls to thresholds"
                />
              </div>
              {consumablesStockData.length > 0 &&
              consumablesStockData.some((s) => s.count > 0) ? (
                <div className="rounded-lg border bg-muted/10 p-4">
                  <h3 className="text-sm font-semibold text-foreground">SKU stock posture</h3>
                  <p className="text-xs text-muted-foreground">Low-stock SKUs vs lines above reorder threshold.</p>
                  <div className="mx-auto mt-2 h-[220px] max-w-md">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={consumablesStockData}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={88}
                          paddingAngle={2}
                          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        >
                          {consumablesStockData.map((_, i) => (
                            <Cell key={i} fill={SPLIT_COLORS[i % SPLIT_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(v) => [`${v} SKUs`, ""]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {rr ? (
            <Card className="border-primary/15 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">Recurring revenue &amp; subscriptions</CardTitle>
                <CardDescription className="text-base">
                  Figures use <span className="font-medium">company_subscriptions</span> and{" "}
                  <span className="font-medium">is_subscription_billing</span> on invoices — no estimated MRR/ARR until Sprint 9
                  pricing fields exist.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!rr.reporting_surface_ready ? (
                  <Alert>
                    <Info className="h-4 w-4" aria-hidden />
                    <AlertTitle className="text-base">No subscription revenue data yet</AlertTitle>
                    <AlertDescription className="text-base text-muted-foreground">
                      Subscription reporting will appear once subscription plans are active. {rr.placeholder_message}
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <KpiCard
                    title="MRR"
                    value={rr.mrr.computable && rr.mrr.formatted_gbp ? rr.mrr.formatted_gbp : "—"}
                    hint={rr.mrr.reason}
                  />
                  <KpiCard
                    title="ARR"
                    value={rr.arr.computable && rr.arr.formatted_gbp ? rr.arr.formatted_gbp : "—"}
                    hint={rr.arr.reason}
                  />
                  <KpiCard title="Active subscriptions" value={String(rr.subscription_counts.active)} hint="status = active" />
                  <KpiCard
                    title="Cancelled (snapshot)"
                    value={String(rr.subscription_counts.cancelled_snapshot)}
                    hint="status = cancelled"
                  />
                  <KpiCard title="New subscriptions (period)" value={String(rr.subscription_counts.new_in_period)} hint="created_at in range" />
                  <KpiCard
                    title="Cancelled in period"
                    value={String(rr.subscription_counts.cancelled_in_period)}
                    hint="cancelled status &amp; updated_at in range (approx.)"
                  />
                  <KpiCard
                    title="Subscription invoiced (period)"
                    value={rr.revenue_invoiced_period_pence.formatted_subscription_tagged}
                    hint="issued_on in range, subscription-flagged, excl. void"
                  />
                  <KpiCard
                    title="One-off invoiced (period)"
                    value={rr.revenue_invoiced_period_pence.formatted_one_off}
                    hint="Other invoices issued in range"
                  />
                  <KpiCard
                    title="Overdue subscription invoices"
                    value={String(rr.overdue_subscription_invoices_count)}
                    hint={`Past due vs ${rr.meta.period_end_date_for_overdue ?? "period end"}; open balance`}
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="overflow-hidden shadow-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Subscription volumes</CardTitle>
                      <CardDescription className="text-xs">Seat counts from subscription rows — period fields use created / cancellation dates.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[260px] pt-2 pb-2">
                      {!subscriptionVolumeData.some((r) => r.count > 0) ? (
                        <p className="text-sm text-muted-foreground">No subscription rows with non-zero counts.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={subscriptionVolumeData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-12} height={56} textAnchor="end" />
                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={36} />
                            <RechartsTooltip formatter={(val) => [`${val}`, "Subscriptions"]} />
                            <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
                              {subscriptionVolumeData.map((_, i) => (
                                <Cell key={i} fill={BAR_SERIES_COLORS[i % BAR_SERIES_COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                  <Card className="overflow-hidden shadow-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Top subscription invoicing (period)</CardTitle>
                      <CardDescription className="text-xs">Subscription-tagged revenue issued in the selected period.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[260px] pt-2 pb-2">
                      {!topSubscriptionCustomersChartData.some((r) => r.pence > 0) ? (
                        <p className="text-sm text-muted-foreground">None in this period.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={[...topSubscriptionCustomersChartData].reverse()}
                            layout="vertical"
                            margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis type="number" tickFormatter={formatPenceTick} />
                            <YAxis type="category" dataKey="label" width={108} tick={{ fontSize: 10 }} />
                            <RechartsTooltip formatter={(val) => formatPenceTick(val)} />
                            <Bar dataKey="pence" name="Invoiced" fill="var(--chart-3)" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="overflow-hidden shadow-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Invoiced: recurring vs one-off</CardTitle>
                      <CardDescription className="text-xs">Accrual by issued_on in the selected period.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[240px] pt-2">
                      {invoicedSplitChart.length === 0 || invoicedSplitChart.every((x) => x.pence <= 0) ? (
                        <p className="text-sm text-muted-foreground">No invoiced revenue in this period.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={invoicedSplitChart}
                              dataKey="pence"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={88}
                              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                            >
                              {invoicedSplitChart.map((_, i) => (
                                <Cell key={i} fill={SPLIT_COLORS[i % SPLIT_COLORS.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip
                              formatter={(v) => formatGBP(typeof v === "number" ? v : Number(v ?? 0))}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                  <Card className="overflow-hidden shadow-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Cash: recurring vs one-off</CardTitle>
                      <CardDescription className="text-xs">Payments with paid_at in the selected period.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[240px] pt-2">
                      {paymentsSplitChart.length === 0 || paymentsSplitChart.every((x) => x.pence <= 0) ? (
                        <p className="text-sm text-muted-foreground">No payments in this period.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={paymentsSplitChart}
                              dataKey="pence"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={88}
                              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                            >
                              {paymentsSplitChart.map((_, i) => (
                                <Cell key={i} fill={SPLIT_COLORS[i % SPLIT_COLORS.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip
                              formatter={(v) => formatGBP(typeof v === "number" ? v : Number(v ?? 0))}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <h3 className="text-base font-semibold">Upcoming renewals</h3>
                    <p className="text-sm text-muted-foreground">
                      Rows where <span className="font-medium">current_period_end</span> falls in the selected date range.
                    </p>
                    {!rr.has_subscription_rows ? (
                      <p className="text-base text-muted-foreground">No subscription rows in the system.</p>
                    ) : rr.upcoming_renewals.length === 0 ? (
                      <p className="text-base text-muted-foreground">No renewals due in this date range.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full min-w-[400px] text-left text-sm">
                          <thead className="border-b bg-muted/40">
                            <tr>
                              <th className="px-3 py-2 font-medium">Company</th>
                              <th className="px-3 py-2 font-medium">Plan</th>
                              <th className="px-3 py-2 font-medium">Status</th>
                              <th className="px-3 py-2 font-medium">Period end</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rr.upcoming_renewals.map((r) => (
                              <tr key={`${r.company_id}-${r.renews_on}`} className="border-b last:border-0">
                                <td className="px-3 py-2">
                                  <Link href={`/admin/crm/${r.company_id}`} className="text-primary underline">
                                    {r.company_name ?? "Company"}
                                  </Link>
                                </td>
                                <td className="px-3 py-2">{r.plan_name ?? "—"}</td>
                                <td className="px-3 py-2 text-muted-foreground">{r.status ?? "—"}</td>
                                <td className="px-3 py-2 tabular-nums">{r.renews_on ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-semibold">Top subscription customers</h3>
                    <p className="text-sm text-muted-foreground">By subscription-tagged invoiced total in the period.</p>
                    {rr.top_subscription_customers.length === 0 ? (
                      <p className="text-base text-muted-foreground">None in this period.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full min-w-[360px] text-left text-sm">
                          <thead className="border-b bg-muted/40">
                            <tr>
                              <th className="px-3 py-2 font-medium">Company</th>
                              <th className="px-3 py-2 font-medium text-right">Invoiced</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rr.top_subscription_customers.map((row) => (
                              <tr key={row.company_id} className="border-b last:border-0">
                                <td className="px-3 py-2">
                                  <Link href={`/admin/crm/${row.company_id}`} className="text-primary underline">
                                    {row.company_name ?? row.company_id}
                                  </Link>
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums font-medium">{row.formatted}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                <details className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
                  <summary className="cursor-pointer font-medium text-foreground">Metric definitions</summary>
                  <ul className="mt-3 list-inside list-disc space-y-1 text-muted-foreground">
                    {Object.entries(rr.definitions).map(([k, v]) => (
                      <li key={k}>
                        <span className="font-mono text-xs">{k}</span>: {v}
                      </li>
                    ))}
                  </ul>
                </details>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Integrations</CardTitle>
              <CardDescription className="text-base">Placeholders until Xero / Stripe ops are wired.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-base">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="font-semibold">Xero</div>
                <p className="mt-1 text-muted-foreground">{data.integrations.xero.message}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="font-semibold">Stripe</div>
                <p className="mt-1 text-muted-foreground">{data.integrations.stripe.message}</p>
              </div>
            </CardContent>
          </Card>

          <Separator />

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">Customers — highest outstanding</h2>
            {topOutstandingChartData.length > 0 && topOutstandingChartData.some((r) => r.pence > 0) ? (
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Outstanding balance by customer (top {topOutstandingChartData.length})</CardTitle>
                  <CardDescription className="text-xs">Same ranking as the table below — filtered open AR.</CardDescription>
                </CardHeader>
                <Separator />
                <CardContent className="h-[min(420px,70vh)] min-h-[240px] w-full pt-4 pb-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[...topOutstandingChartData].reverse()}
                      layout="vertical"
                      margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tickFormatter={formatPenceTick} />
                      <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11 }} />
                      <RechartsTooltip formatter={(val) => formatPenceTick(val)} />
                      <Bar dataKey="pence" name="Outstanding" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : null}
            {data.top_outstanding_companies.length === 0 ? (
              <p className="text-base text-muted-foreground">No outstanding balances for this filter.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[520px] text-left text-base">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Customer</th>
                      <th className="px-4 py-3 font-semibold text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_outstanding_companies.map((row) => (
                      <tr key={row.company_id} className="border-b last:border-0">
                        <td className="px-4 py-3">
                          <Link href={`/admin/crm/${row.company_id}`} className="font-medium text-primary underline">
                            {row.company_name ?? row.company_id}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">{row.formatted_outstanding}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">Overdue invoices</h2>
            {data.overdue_invoices.length === 0 ? (
              <p className="text-base text-muted-foreground">No overdue invoices for this filter.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[640px] text-left text-base">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Invoice</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Due</th>
                      <th className="px-4 py-3 font-semibold text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.overdue_invoices.map((inv) => (
                      <tr key={inv.id} className="border-b last:border-0">
                        <td className="px-4 py-3">
                          <Link href={`/admin/invoices/${inv.id}`} className="font-medium text-primary underline">
                            {inv.display_reference ?? inv.invoice_number ?? inv.id}
                          </Link>
                          {inv.company_name ? <div className="text-sm text-muted-foreground">{inv.company_name}</div> : null}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge kind="invoice" status={inv.status ?? ""} />
                        </td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">{inv.due_date ?? "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">
                          {inv.formatted_outstanding ?? formatGBP(inv.outstanding_pence ?? 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">Draft invoices needing review</h2>
            {data.draft_invoices.length === 0 ? (
              <p className="text-base text-muted-foreground">No draft invoices for this filter.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[640px] text-left text-base">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Invoice</th>
                      <th className="px-4 py-3 font-semibold">Updated</th>
                      <th className="px-4 py-3 font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.draft_invoices.map((inv) => (
                      <tr key={inv.id} className="border-b last:border-0">
                        <td className="px-4 py-3">
                          <Link href={`/admin/invoices/${inv.id}`} className="font-medium text-primary underline">
                            {inv.display_reference ?? inv.invoice_number ?? inv.id}
                          </Link>
                          {inv.company_name ? <div className="text-sm text-muted-foreground">{inv.company_name}</div> : null}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{inv.updated_at ? new Date(inv.updated_at).toLocaleString("en-GB") : "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">
                          {inv.formatted_amount ?? formatGBP(inv.total ?? 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">Recent payments</h2>
            {data.recent_payments.length === 0 ? (
              <p className="text-base text-muted-foreground">No recent payments.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[720px] text-left text-base">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Amount</th>
                      <th className="px-4 py-3 font-semibold">Invoice</th>
                      <th className="px-4 py-3 font-semibold">Method</th>
                      <th className="px-4 py-3 font-semibold">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_payments.map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-semibold tabular-nums">{formatGBP(p.amount ?? 0)}</td>
                        <td className="px-4 py-3">
                          {p.invoice_id ? (
                            <Link href={`/admin/invoices/${p.invoice_id}`} className="text-primary underline">
                              {p.invoice?.invoice_number ?? "View invoice"}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 capitalize text-muted-foreground">{(p.method ?? "").replace(/_/g, " ") || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {p.paid_at ? new Date(p.paid_at).toLocaleString("en-GB") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
