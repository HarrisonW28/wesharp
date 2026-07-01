"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";

import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { BillingReportResponseSchema } from "@/lib/api/admin-billing-report-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { formatGBP } from "@/lib/format/money";

import { NavBreadcrumbs } from "@/components/layout/NavBreadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReportCsvExportButton } from "@/components/reports/ReportCsvExportButton";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CompanyOpt = { id: string; name: string; city?: string | null };

const AGE_BUCKET_LABEL: Record<string, string> = {
  current: "Current",
  "1_30": "1–30 d overdue",
  "31_60": "31–60 d",
  "61_90": "61–90 d",
  "90_plus": "90+ d",
};

const PAYMENT_METHODS = [
  "card",
  "bank_transfer",
  "cash",
  "stripe",
  "manual",
  "other",
  "invoice_later",
] as const;

function buildQs(params: Record<string, string>): string {
  const u = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== "") u.set(k, v);
  });
  const s = u.toString();
  return s ? `?${s}` : "";
}

/** Short card copy; full definitions still listed below from the API. */
const BILLING_KPI_HINTS = {
  invoices_sent: "Issued in period — excludes draft & void.",
  invoices_paid: "Invoices marked paid with issue date in range.",
  overdue_period: "Invoices in overdue status in period.",
  unpaid_snapshot: "Still owing as of period end (AR snapshot).",
  total_outstanding: "Sum of unpaid balances on that snapshot.",
  total_paid: "Cash in from invoice payments in period.",
  payments_rows: "Payment rows with paid date in range.",
  avg_days_to_pay: "Average days from issue date to last payment.",
  cost_allocations: "Manual allocations with created_at in the date range (and company filter when set).",
  consumable_usage_cost: "Estimated consumable £ from logged usages in usage_date range linked to orders.",
  estimated_direct_cost: "Allocations period total plus consumable usage cost — Sprint 23.5 ops finance signal.",
} as const;

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

function formatPenceTick(value: unknown): string {
  const pence = typeof value === "number" ? value : Number(value);
  return formatGBP(Number.isFinite(pence) ? pence : 0);
}

type TableMeta = { current_page?: number; last_page?: number; per_page?: number; total?: number };

function TablePager(props: {
  meta?: TableMeta;
  param: string;
  setFilter: (patch: Record<string, string>) => void;
}) {
  const cur = props.meta?.current_page ?? 1;
  const last = props.meta?.last_page ?? 1;
  const total = props.meta?.total;

  if (last <= 1) {
    return total != null ? (
      <p className="mt-2 text-xs text-muted-foreground tabular-nums">{total} row{total === 1 ? "" : "s"}</p>
    ) : null;
  }

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
      <p className="text-muted-foreground tabular-nums">
        Page {cur} of {last}
        {total != null ? ` · ${total} rows` : ""}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={cur <= 1}
          onClick={() => props.setFilter({ [props.param]: String(cur - 1) })}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={cur >= last}
          onClick={() => props.setFilter({ [props.param]: String(cur + 1) })}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default function AdminBillingReportPage() {
  const admin = useAdminApi();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const dateFrom = searchParams.get("date_from") ?? "";
  const dateTo = searchParams.get("date_to") ?? "";
  const companyId = searchParams.get("company_id") ?? "";
  const invoiceStatus = searchParams.get("invoice_status") ?? "";
  const paymentStatus = searchParams.get("payment_status") ?? "";
  const paymentMethod = searchParams.get("payment_method") ?? "";
  const arAgeBucket = searchParams.get("ar_age_bucket") ?? "";
  const page = searchParams.get("page") ?? "1";
  const unpaidPage = searchParams.get("unpaid_page") ?? "";
  const overduePage = searchParams.get("overdue_page") ?? "";

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

  const reportQs = useMemo(
    () =>
      buildQs({
        date_from: dateFrom,
        date_to: dateTo,
        company_id: companyId,
        invoice_status: invoiceStatus,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        ar_age_bucket: arAgeBucket,
        page,
        unpaid_page: unpaidPage,
        overdue_page: overduePage,
      }),
    [
      arAgeBucket,
      companyId,
      dateFrom,
      dateTo,
      invoiceStatus,
      overduePage,
      page,
      paymentMethod,
      paymentStatus,
      unpaidPage,
    ],
  );

  /** Query params aligned with CSV exporters (no table pagination). */
  const exportCoreQs = useMemo(
    () =>
      buildQs({
        date_from: dateFrom,
        date_to: dateTo,
        company_id: companyId,
        invoice_status: invoiceStatus,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
      }),
    [companyId, dateFrom, dateTo, invoiceStatus, paymentMethod, paymentStatus],
  );

  const reportQuery = useQuery({
    queryKey: ["admin-billing-report", reportQs],
    queryFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/reports/billing${reportQs}`);
      if (!res.ok) throw new Error(res.message);
      const parsed = BillingReportResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected billing report payload.");
      return parsed.data.data;
    },
  });

  const companiesQuery = useQuery({
    queryKey: ["admin-lookups-companies-billing-report"],
    queryFn: async () => {
      const res = await admin.json<unknown>("/api/admin/lookups/companies");
      if (!res.ok) throw new Error(res.message);
      const items = (res.data as { data?: { items?: CompanyOpt[] } })?.data?.items;
      return Array.isArray(items) ? items : [];
    },
  });

  useEffect(() => {
    if (reportQuery.isError) toast.error((reportQuery.error as Error).message);
  }, [reportQuery.error, reportQuery.isError]);

  const d = reportQuery.data;
  const definitions = d?.definitions ?? {};

  const ageingChartData = useMemo(
    () =>
      (d?.series.ageing ?? []).map((row) => ({
        ...row,
        label: AGE_BUCKET_LABEL[row.bucket] ?? row.bucket,
      })),
    [d?.series.ageing],
  );
  const hasAgeingAmounts = ageingChartData.some((r) => r.outstanding_pence > 0);

  const methodChartData = useMemo(
    () =>
      (d?.series.payment_method_breakdown ?? []).map((r) => ({
        ...r,
        label: r.payment_method.replace(/_/g, " "),
      })),
    [d?.series.payment_method_breakdown],
  );

  const paymentsTrend = d?.series.payments_by_day ?? [];
  const hasPaymentsTrend = paymentsTrend.some((r) => r.amount_pence > 0);

  const outstandingCustomers = d?.series.outstanding_by_customer ?? [];

  return (
    <div className="space-y-8">
      <NavBreadcrumbs suffix={[{ label: "Billing report" }]} />
      <PageHeader
        title="Invoices & payments"
        description="AR snapshot as of the period end date, payment cash in period, and ageing — amounts in GBP from the server."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ReportCsvExportButton
              admin={admin}
              exportPath={`/api/admin/reports/exports/invoices-outstanding.csv${exportCoreQs}`}
              label="Export invoices (CSV)"
              disabled={
                reportQuery.isPending ||
                reportQuery.isError ||
                !d ||
                d.kpis.invoices_sent_count <= 0
              }
            />
            <ReportCsvExportButton
              admin={admin}
              exportPath={`/api/admin/reports/exports/payments.csv${exportCoreQs}`}
              label="Export payments (CSV)"
              disabled={
                reportQuery.isPending ||
                reportQuery.isError ||
                !d ||
                d.kpis.payments_received_count <= 0
              }
            />
            <Button asChild variant="outline" className="text-base">
              <Link href="/admin/reports/sales">Sales report</Link>
            </Button>
          </div>
        }
      />

      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription className="text-base">
            <span className="font-medium">Issued cohort</span> uses <span className="font-medium">issued_on</span>;{" "}
            <span className="font-medium">payments</span> use <span className="font-medium">paid_at</span>. Outstanding and ageing are{" "}
            <span className="font-medium">as of the end of &quot;To&quot;</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
          <div className="space-y-2">
            <Label htmlFor="br-from" className="text-base">
              From
            </Label>
            <Input
              id="br-from"
              type="date"
              className="h-11 text-base"
              value={dateFrom}
              onChange={(e) => setFilter({ date_from: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="br-to" className="text-base">
              To (AR as-of)
            </Label>
            <Input
              id="br-to"
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
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-base">
                  All
                </SelectItem>
                {(["draft", "sent", "overdue", "paid", "void"] as const).map((s) => (
                  <SelectItem key={s} value={s} className="text-base">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-base">Payment status</Label>
            <Select
              value={paymentStatus || "__all__"}
              onValueChange={(v) => setFilter({ payment_status: v === "__all__" ? "" : v })}
            >
              <SelectTrigger className="h-11 text-base">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-base">
                  All
                </SelectItem>
                {(["unpaid", "part_paid", "paid", "overdue", "refunded", "written_off"] as const).map((s) => (
                  <SelectItem key={s} value={s} className="text-base">
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-base">Payment method</Label>
            <Select
              value={paymentMethod || "__all__"}
              onValueChange={(v) => setFilter({ payment_method: v === "__all__" ? "" : v })}
            >
              <SelectTrigger className="h-11 text-base">
                <SelectValue placeholder="All methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-base">
                  All methods
                </SelectItem>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m} className="text-base">
                    {m.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2 lg:col-span-3 xl:col-span-2">
            <Label className="text-base">AR lists: overdue range (ageing bucket)</Label>
            <Select
              value={arAgeBucket || "__all__"}
              onValueChange={(v) => setFilter({ ar_age_bucket: v === "__all__" ? "" : v })}
            >
              <SelectTrigger className="h-11 text-base">
                <SelectValue placeholder="All buckets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-base">
                  All (no bucket filter)
                </SelectItem>
                <SelectItem value="current" className="text-base">
                  Current (not overdue)
                </SelectItem>
                <SelectItem value="1_30" className="text-base">
                  1–30 days overdue
                </SelectItem>
                <SelectItem value="31_60" className="text-base">
                  31–60 days
                </SelectItem>
                <SelectItem value="61_90" className="text-base">
                  61–90 days
                </SelectItem>
                <SelectItem value="90_plus" className="text-base">
                  90+ days
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-3 xl:col-span-4 2xl:col-span-6">
            <Button
              type="button"
              variant="outline"
              className="text-base"
              onClick={() => {
                setFilter({
                  date_from: "",
                  date_to: "",
                  company_id: "",
                  invoice_status: "",
                  payment_status: "",
                  payment_method: "",
                  ar_age_bucket: "",
                  page: "1",
                  unpaid_page: "",
                  overdue_page: "",
                });
              }}
            >
              Clear filters
            </Button>
            <Button type="button" variant="secondary" className="text-base" onClick={() => void reportQuery.refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {reportQuery.isPending ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border bg-card text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin" aria-hidden />
          <p className="text-base">Loading billing report…</p>
        </div>
      ) : reportQuery.isError ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" aria-hidden />
          <p className="text-base text-destructive">{(reportQuery.error as Error).message}</p>
          <Button type="button" onClick={() => void reportQuery.refetch()}>
            Retry
          </Button>
        </div>
      ) : d ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
            <KpiCard title="Invoices sent (period)" value={String(d.kpis.invoices_sent_count)} hint={BILLING_KPI_HINTS.invoices_sent} />
            <KpiCard title="Invoices paid (period)" value={String(d.kpis.invoices_paid_count)} hint={BILLING_KPI_HINTS.invoices_paid} />
            <KpiCard title="Overdue status (period)" value={String(d.kpis.overdue_invoices_period_count)} hint={BILLING_KPI_HINTS.overdue_period} />
            <KpiCard title="Unpaid snapshot" value={String(d.kpis.unpaid_invoices_snapshot_count)} hint={BILLING_KPI_HINTS.unpaid_snapshot} />
            <KpiCard title="Total outstanding" value={formatGBP(d.kpis.total_outstanding_pence)} hint={BILLING_KPI_HINTS.total_outstanding} />
            <KpiCard title="Total paid (period)" value={formatGBP(d.kpis.total_paid_pence)} hint={BILLING_KPI_HINTS.total_paid} />
            <KpiCard title="Payments (rows)" value={String(d.kpis.payments_received_count)} hint={BILLING_KPI_HINTS.payments_rows} />
            <KpiCard
              title="Avg days to pay"
              value={d.kpis.average_days_to_pay != null ? `${d.kpis.average_days_to_pay}` : "—"}
              hint={BILLING_KPI_HINTS.avg_days_to_pay}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <KpiCard
              title="Cost allocations (period)"
              value={formatGBP(d.kpis.cost_allocations_period_pence)}
              hint={BILLING_KPI_HINTS.cost_allocations}
            />
            <KpiCard
              title="Consumable usage cost (period)"
              value={formatGBP(d.kpis.consumable_usage_cost_period_pence)}
              hint={BILLING_KPI_HINTS.consumable_usage_cost}
            />
            <KpiCard
              title="Estimated direct cost (period)"
              value={formatGBP(d.kpis.estimated_direct_cost_period_pence)}
              hint={BILLING_KPI_HINTS.estimated_direct_cost}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base">AR ageing (outstanding)</CardTitle>
                <CardDescription className="text-xs">{definitions.ageing}</CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="h-[300px] w-full pt-4 pb-2 sm:h-[320px]">
                {!hasAgeingAmounts ? (
                  <p className="text-sm text-muted-foreground">No outstanding balance in this snapshot.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ageingChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-12} height={56} textAnchor="end" />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={formatPenceTick} width={72} />
                      <RechartsTooltip formatter={(val) => formatPenceTick(val)} />
                      <Legend />
                      <Bar dataKey="outstanding_pence" name="Outstanding" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base">Payments by method (period)</CardTitle>
                <CardDescription className="text-xs">Filtered by payment method when set.</CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="h-[300px] w-full pt-4 pb-2 sm:h-[320px]">
                {methodChartData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No payments in this window.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={methodChartData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tickFormatter={formatPenceTick} />
                      <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 11 }} />
                      <RechartsTooltip formatter={(val) => formatPenceTick(val)} />
                      <Bar dataKey="amount_pence" name="Amount" fill="hsl(142 76% 36%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base">Payments over time</CardTitle>
                <CardDescription className="text-xs">Sum of amounts by paid date (UTC day).</CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="h-[280px] w-full pt-4 pb-2 sm:h-[300px]">
                {!hasPaymentsTrend ? (
                  <p className="text-sm text-muted-foreground">No payment activity in this window.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={paymentsTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={formatPenceTick} width={72} />
                      <RechartsTooltip formatter={(val) => formatPenceTick(val)} />
                      <Legend />
                      <Line type="monotone" dataKey="amount_pence" name="Paid" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base">Outstanding by customer</CardTitle>
                <CardDescription className="text-xs">Top balances from AR snapshot (max 50).</CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="h-[280px] w-full pt-4 pb-2 sm:h-[300px]">
                {outstandingCustomers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No outstanding balances for this filter.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={outstandingCustomers.map((r) => ({
                        ...r,
                        label: r.company_name.length > 24 ? `${r.company_name.slice(0, 24)}…` : r.company_name,
                      }))}
                      layout="vertical"
                      margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tickFormatter={formatPenceTick} />
                      <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 10 }} />
                      <RechartsTooltip formatter={(val) => formatPenceTick(val)} />
                      <Bar dataKey="outstanding_pence" name="Outstanding" fill="hsl(25 95% 48%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invoices issued in period</CardTitle>
              <CardDescription className="text-xs">Paginated cohort; suitable for export via browser.</CardDescription>
            </CardHeader>
            <CardContent>
              {!d.table || d.table.rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No invoices issued in this window.</p>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead className="border-b bg-muted/40">
                        <tr>
                          <th className="px-3 py-2 font-medium">Invoice</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                          <th className="px-3 py-2 font-medium text-right">Total</th>
                          <th className="px-3 py-2 font-medium">Issued</th>
                          <th className="px-3 py-2 font-medium">Due</th>
                          <th className="px-3 py-2 font-medium">Company</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.table.rows.map((row) => (
                          <tr key={String(row.id)} className="border-b last:border-0">
                            <td className="px-3 py-2">
                              <Link href={`/admin/invoices/${String(row.id)}`} className="text-primary underline">
                                {String(row.invoice_number ?? row.id)}
                              </Link>
                            </td>
                            <td className="px-3 py-2">
                              <StatusBadge kind="invoice" status={String(row.invoice_status ?? "")} />
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums font-medium">{formatGBP(Number(row.total_pence ?? 0))}</td>
                            <td className="px-3 py-2 text-muted-foreground">{row.issued_on != null ? String(row.issued_on) : "—"}</td>
                            <td className="px-3 py-2 text-muted-foreground">{row.due_on != null ? String(row.due_on) : "—"}</td>
                            <td className="px-3 py-2">{row.company_name != null ? String(row.company_name) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <TablePager param="page" meta={d.table.meta as TableMeta | undefined} setFilter={setFilter} />
                </>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Unpaid invoices (AR snapshot)</CardTitle>
                <CardDescription className="text-xs">Positive residual as of period end; respects ageing bucket filter.</CardDescription>
              </CardHeader>
              <CardContent>
                {d.unpaid_invoices.rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None for this filter.</p>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full min-w-[720px] text-left text-sm">
                        <thead className="border-b bg-muted/40">
                          <tr>
                            <th className="px-3 py-2 font-medium">Invoice</th>
                            <th className="px-3 py-2 font-medium">Company</th>
                            <th className="px-3 py-2 font-medium">Due</th>
                            <th className="px-3 py-2 font-medium text-right">Outstanding</th>
                            <th className="px-3 py-2 font-medium">Ageing</th>
                          </tr>
                        </thead>
                        <tbody>
                          {d.unpaid_invoices.rows.map((row) => (
                            <tr key={String(row.id)} className="border-b last:border-0">
                              <td className="px-3 py-2">
                                <Link href={`/admin/invoices/${String(row.id)}`} className="text-primary underline">
                                  {String(row.invoice_number ?? row.id)}
                                </Link>
                              </td>
                              <td className="px-3 py-2">{row.company_name != null ? String(row.company_name) : "—"}</td>
                              <td className="px-3 py-2 text-muted-foreground">{row.due_on != null ? String(row.due_on) : "—"}</td>
                              <td className="px-3 py-2 text-right tabular-nums font-medium">
                                {formatGBP(Number(row.residual_pence ?? 0))}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {AGE_BUCKET_LABEL[String(row.ageing_bucket ?? "")] ?? String(row.ageing_bucket ?? "—")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <TablePager param="unpaid_page" meta={d.unpaid_invoices.meta as TableMeta | undefined} setFilter={setFilter} />
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Overdue invoices (AR snapshot)</CardTitle>
                <CardDescription className="text-xs">Due before as-of date with positive residual.</CardDescription>
              </CardHeader>
              <CardContent>
                {d.overdue_invoices.rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None for this filter.</p>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full min-w-[640px] text-left text-sm">
                        <thead className="border-b bg-muted/40">
                          <tr>
                            <th className="px-3 py-2 font-medium">Invoice</th>
                            <th className="px-3 py-2 font-medium">Company</th>
                            <th className="px-3 py-2 font-medium">Due</th>
                            <th className="px-3 py-2 font-medium text-right">Outstanding</th>
                            <th className="px-3 py-2 font-medium text-right">Days past</th>
                          </tr>
                        </thead>
                        <tbody>
                          {d.overdue_invoices.rows.map((row) => (
                            <tr key={String(row.id)} className="border-b last:border-0">
                              <td className="px-3 py-2">
                                <Link href={`/admin/invoices/${String(row.id)}`} className="text-primary underline">
                                  {String(row.invoice_number ?? row.id)}
                                </Link>
                              </td>
                              <td className="px-3 py-2">{row.company_name != null ? String(row.company_name) : "—"}</td>
                              <td className="px-3 py-2 text-muted-foreground">{row.due_on != null ? String(row.due_on) : "—"}</td>
                              <td className="px-3 py-2 text-right tabular-nums font-medium">
                                {formatGBP(Number(row.residual_pence ?? 0))}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">{row.days_past_due != null ? String(row.days_past_due) : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <TablePager param="overdue_page" meta={d.overdue_invoices.meta as TableMeta | undefined} setFilter={setFilter} />
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Separator />

          <section className="space-y-2 text-sm text-muted-foreground">
            <h3 className="font-medium text-foreground">Metric definitions</h3>
            <ul className="list-inside list-disc space-y-1">
              {Object.entries(definitions).map(([k, v]) => (
                <li key={k}>
                  <span className="font-mono text-xs">{k}</span>: {v}
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}
