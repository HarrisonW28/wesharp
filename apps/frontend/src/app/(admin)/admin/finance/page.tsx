"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";

import { AlertCircle, Info, Loader2, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { toast } from "sonner";

import { FinanceDashboardResponseSchema } from "@/lib/api/admin-finance-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { formatGBP } from "@/lib/format/money";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReportCsvExportButton } from "@/components/reports/ReportCsvExportButton";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
