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
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { SalesReportResponseSchema } from "@/lib/api/admin-sales-report-schema";
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
    <Card className="min-h-[108px] shadow-sm">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium text-muted-foreground">{props.title}</CardTitle>
        {props.hint ? <CardDescription className="text-xs">{props.hint}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <p className="text-xl font-semibold tabular-nums tracking-tight sm:text-2xl">{props.value}</p>
      </CardContent>
    </Card>
  );
}

function formatRechartsRevenuePence(value: unknown): string {
  const pence = typeof value === "number" ? value : Number(value);
  return formatGBP(Number.isFinite(pence) ? pence : 0);
}

export default function AdminSalesReportPage() {
  const admin = useAdminApi();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const dateFrom = searchParams.get("date_from") ?? "";
  const dateTo = searchParams.get("date_to") ?? "";
  const companyId = searchParams.get("company_id") ?? "";
  const invoiceStatus = searchParams.get("invoice_status") ?? "";
  const paymentStatus = searchParams.get("payment_status") ?? "";

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
      }),
    [companyId, dateFrom, dateTo, invoiceStatus, paymentStatus],
  );

  const reportQuery = useQuery({
    queryKey: ["admin-sales-report", reportQs],
    queryFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/reports/sales${reportQs}`);
      if (!res.ok) throw new Error(res.message);
      const parsed = SalesReportResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected sales report payload.");
      return parsed.data.data;
    },
  });

  const companiesQuery = useQuery({
    queryKey: ["admin-lookups-companies-sales-report"],
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
  const hasRevenueSeries = (d?.series.revenue_by_day.length ?? 0) > 0;
  const paidVs = d?.series.paid_vs_unpaid;
  const paidVsChart =
    paidVs && (paidVs.collected_on_period_invoices_pence > 0 || paidVs.unpaid_residual_on_period_invoices_pence > 0)
      ? [
          {
            name: "Collected (on period invoices)",
            pence: paidVs.collected_on_period_invoices_pence,
          },
          { name: "Unpaid residual (cohort)", pence: paidVs.unpaid_residual_on_period_invoices_pence },
        ]
      : [];
  const statusRows = d?.series.invoice_status_breakdown ?? [];
  const hasStatus = statusRows.some((r) => r.count > 0);
  const topCustomers = d?.table?.rows ?? [];
  const definitions = d?.definitions ?? {};

  return (
    <div className="space-y-8">
      <NavBreadcrumbs suffix={[{ label: "Sales report" }]} />
      <PageHeader
        title="Sales & revenue"
        description="Invoice accrual and payment cash in GBP — all figures from the server; definitions below each section."
        actions={
          <div className="flex flex-wrap gap-2">
            <ReportCsvExportButton
              admin={admin}
              exportPath={`/api/admin/reports/exports/sales-invoices.csv${reportQs}`}
              label="Export sales (CSV)"
              disabled={reportQuery.isPending || reportQuery.isError || !d || d.kpis.total_revenue_pence <= 0}
            />
            <ReportCsvExportButton
              admin={admin}
              exportPath={`/api/admin/reports/exports/payments.csv${reportQs}`}
              label="Export payments (CSV)"
              disabled={
                reportQuery.isPending || reportQuery.isError || !d || d.kpis.payments_received_count <= 0
              }
              variant="secondary"
            />
          </div>
        }
      />

      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription className="text-base">
            Date range applies to invoice <span className="font-medium">issued_on</span> and payment{" "}
            <span className="font-medium">paid_at</span> (see metric definitions).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div className="space-y-2">
            <Label htmlFor="sr-from" className="text-base">
              From
            </Label>
            <Input
              id="sr-from"
              type="date"
              className="h-11 text-base"
              value={dateFrom}
              onChange={(e) => setFilter({ date_from: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sr-to" className="text-base">
              To
            </Label>
            <Input
              id="sr-to"
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
          <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-3 xl:col-span-5">
            <Button
              type="button"
              variant="outline"
              className="text-base"
              onClick={() => {
                setFilter({ date_from: "", date_to: "", company_id: "", invoice_status: "", payment_status: "" });
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
          <p className="text-base">Loading sales report…</p>
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
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
            <KpiCard title="Total revenue (billed)" value={formatGBP(d.kpis.total_revenue_pence)} hint="Accrual cohort" />
            <KpiCard title="Paid revenue (cash)" value={formatGBP(d.kpis.paid_revenue_pence)} hint="Payments in period" />
            <KpiCard title="Unpaid revenue (residual)" value={formatGBP(d.kpis.unpaid_revenue_pence)} hint="On cohort" />
            <KpiCard title="Avg invoice value" value={formatGBP(d.kpis.average_invoice_value_pence)} hint="Cohort ÷ count" />
            <KpiCard title="Invoices sent" value={String(d.kpis.invoices_sent_count)} hint="Sent / overdue / paid" />
            <KpiCard title="Payments received" value={String(d.kpis.payments_received_count)} hint="Rows in period" />
            <KpiCard title="Outstanding balance" value={formatGBP(d.kpis.outstanding_balance_pence)} hint="Non-paid cohort" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base">Revenue by day</CardTitle>
                <CardDescription className="text-xs">Sum of invoice totals by issued date (revenue cohort).</CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="h-[300px] w-full pt-4 pb-2 sm:h-[320px]">
                {!hasRevenueSeries ? (
                  <p className="text-sm text-muted-foreground">No billed revenue in this window.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={d.series.revenue_by_day} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatGBP(Number(v))} width={72} />
                      <RechartsTooltip formatter={(val) => formatRechartsRevenuePence(val)} />
                      <Legend />
                      <Bar dataKey="revenue_pence" name="Billed (GBP)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base">Collected vs unpaid (cohort)</CardTitle>
                <CardDescription className="text-xs">{definitions.paid_vs_unpaid ?? ""}</CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="h-[300px] w-full pt-4 pb-2 sm:h-[320px]">
                {paidVsChart.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No collected or unpaid amounts for this cohort.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={paidVsChart} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tickFormatter={(v) => formatGBP(Number(v))} />
                      <YAxis type="category" dataKey="name" width={168} tick={{ fontSize: 11 }} />
                      <RechartsTooltip formatter={(val) => formatRechartsRevenuePence(val)} />
                      <Bar dataKey="pence" name="Amount" fill="hsl(142 76% 36%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invoice status breakdown</CardTitle>
              <CardDescription className="text-xs">Issued in range; void excluded from this breakdown.</CardDescription>
            </CardHeader>
            <CardContent>
              {!hasStatus ? (
                <p className="text-sm text-muted-foreground">No invoices in this window.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[400px] text-left text-sm">
                    <thead className="border-b bg-muted/40">
                      <tr>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium text-right">Count</th>
                        <th className="px-3 py-2 font-medium text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statusRows.map((row) => (
                        <tr key={row.status} className="border-b last:border-0">
                          <td className="px-3 py-2">
                            <StatusBadge kind="invoice" status={row.status} />
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{row.count}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-medium">{formatGBP(row.total_pence)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Top customers by billed amount</h2>
            {topCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No customer totals for this filter.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[360px] text-left text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Customer</th>
                      <th className="px-4 py-3 font-semibold text-right">Billed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCustomers.map((row) => (
                      <tr key={String(row.company_id)} className="border-b last:border-0">
                        <td className="px-4 py-3">
                          <Link href={`/admin/crm/${String(row.company_id)}`} className="font-medium text-primary underline">
                            {String(row.company_name ?? row.company_id)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">
                          {formatGBP(Number(row.revenue_pence ?? 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent invoices</CardTitle>
                <CardDescription className="text-xs">Latest in filter window.</CardDescription>
              </CardHeader>
              <CardContent>
                {d.recent_invoices.rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None in this window.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[320px] text-left text-sm">
                      <thead className="border-b bg-muted/40">
                        <tr>
                          <th className="px-3 py-2 font-medium">Invoice</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                          <th className="px-3 py-2 font-medium text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.recent_invoices.rows.map((inv) => (
                          <tr key={String(inv.id)} className="border-b last:border-0">
                            <td className="px-3 py-2">
                              <Link href={`/admin/invoices/${String(inv.id)}`} className="text-primary underline">
                                {String(inv.invoice_number ?? inv.id)}
                              </Link>
                              {inv.company_name ? (
                                <div className="text-xs text-muted-foreground">{String(inv.company_name)}</div>
                              ) : null}
                            </td>
                            <td className="px-3 py-2">
                              <StatusBadge kind="invoice" status={String(inv.invoice_status ?? "")} />
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">{formatGBP(Number(inv.total_pence ?? 0))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent payments</CardTitle>
                <CardDescription className="text-xs">By paid_at in period.</CardDescription>
              </CardHeader>
              <CardContent>
                {d.recent_payments.rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None in this window.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[320px] text-left text-sm">
                      <thead className="border-b bg-muted/40">
                        <tr>
                          <th className="px-3 py-2 font-medium">Amount</th>
                          <th className="px-3 py-2 font-medium">Invoice</th>
                          <th className="px-3 py-2 font-medium">When</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.recent_payments.rows.map((p) => (
                          <tr key={String(p.id)} className="border-b last:border-0">
                            <td className="px-3 py-2 font-semibold tabular-nums">{formatGBP(Number(p.amount_pence ?? 0))}</td>
                            <td className="px-3 py-2">
                              {p.invoice_id ? (
                                <Link href={`/admin/invoices/${String(p.invoice_id)}`} className="text-primary underline">
                                  {String(p.invoice_number ?? "View")}
                                </Link>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {p.paid_at ? new Date(String(p.paid_at)).toLocaleString("en-GB") : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
