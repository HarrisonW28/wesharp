"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";

import { AlertCircle, Loader2, RefreshCw, Repeat } from "lucide-react";
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

import { RecurringRevenueReportResponseSchema } from "@/lib/api/admin-recurring-revenue-report-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { formatGBP } from "@/lib/format/money";

import { NavBreadcrumbs } from "@/components/layout/NavBreadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReportCsvExportButton } from "@/components/reports/ReportCsvExportButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CompanyOpt = { id: string; name: string; city?: string | null };
type PlanOpt = { id: string; name: string };

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

function formatPenceTick(value: unknown): string {
  const pence = typeof value === "number" ? value : Number(value);
  return formatGBP(Number.isFinite(pence) ? pence : 0);
}

const SUB_STATUSES = ["active", "cancelled", "paused", "expired"] as const;

function SubscriptionStatusBadge({ status }: { status?: string | null }) {
  const s = (status ?? "").trim().toLowerCase();
  if (s === "") return <Badge variant="outline">—</Badge>;
  const v =
    s === "active" ? "success" : s === "cancelled" ? "destructive" : s === "paused" ? "warning" : "secondary";
  return (
    <Badge variant={v} className="capitalize">
      {s.replace(/_/g, " ")}
    </Badge>
  );
}

export default function AdminRecurringRevenueReportPage() {
  const admin = useAdminApi();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const dateFrom = searchParams.get("date_from") ?? "";
  const dateTo = searchParams.get("date_to") ?? "";
  const companyId = searchParams.get("company_id") ?? "";
  const subscriptionPlanId = searchParams.get("subscription_plan_id") ?? "";
  const subscriptionStatus = searchParams.get("subscription_status") ?? "";

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
        subscription_plan_id: subscriptionPlanId,
        subscription_status: subscriptionStatus,
      }),
    [companyId, dateFrom, dateTo, subscriptionPlanId, subscriptionStatus],
  );

  const reportQuery = useQuery({
    queryKey: ["admin-recurring-revenue-report", reportQs],
    queryFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/reports/recurring-revenue${reportQs}`);
      if (!res.ok) throw new Error(res.message);
      const parsed = RecurringRevenueReportResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected recurring revenue payload.");
      return parsed.data.data;
    },
  });

  const companiesQuery = useQuery({
    queryKey: ["admin-lookups-companies-recurring-revenue-report"],
    queryFn: async () => {
      const res = await admin.json<unknown>("/api/admin/lookups/companies");
      if (!res.ok) throw new Error(res.message);
      const items = (res.data as { data?: { items?: CompanyOpt[] } })?.data?.items;
      return Array.isArray(items) ? items : [];
    },
  });

  const plansQuery = useQuery({
    queryKey: ["admin-subscription-plans-for-recurring-revenue"],
    queryFn: async () => {
      const res = await admin.json<unknown>("/api/admin/subscription-plans");
      if (!res.ok) throw new Error(res.message);
      const items = (res.data as { data?: { items?: { data?: PlanOpt }[] } })?.data?.items;
      const out: PlanOpt[] = [];
      if (Array.isArray(items)) {
        for (const row of items) {
          const p = row?.data;
          if (p && typeof p.id === "string" && typeof p.name === "string") out.push({ id: p.id, name: p.name });
        }
      }
      return out;
    },
  });

  useEffect(() => {
    if (reportQuery.isError) toast.error((reportQuery.error as Error).message);
  }, [reportQuery.error, reportQuery.isError]);

  const d = reportQuery.data;
  const detail = d?.recurring_revenue_detail;
  const definitions = d?.definitions ?? {};

  const mrrTrend = detail?.mrr_trend ?? [];
  const arrTrend = detail?.arr_trend ?? [];

  const splitInv = d?.series?.invoiced_split ?? [];
  const splitPay = d?.series?.payments_split ?? [];

  const upcoming = detail?.upcoming_renewals ?? [];
  const activeByPlan = detail?.active_subscriptions_by_plan ?? [];
  const topCustomers = detail?.top_subscription_customers ?? [];
  const overageByCompany = detail?.revenue_overage_lines_by_company ?? [];

  return (
    <div className="space-y-8">
      <NavBreadcrumbs suffix={[{ label: "Recurring revenue" }]} />
      <PageHeader
        title="Recurring revenue"
        description="Subscriptions, renewals, and recurring vs one-off split. Revenue figures are invoice-issued cohorts and payment cash in period (see definitions)."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="text-base">
              <Link href="/admin/reports/sales">Sales report</Link>
            </Button>
            <Button asChild variant="outline" className="text-base">
              <Link href="/admin/reports/billing">Billing report</Link>
            </Button>
            <ReportCsvExportButton
              admin={admin}
              exportPath={`/api/admin/reports/exports/subscriptions.csv${buildQs({
                company_id: companyId,
                subscription_plan_id: subscriptionPlanId,
                subscription_status: subscriptionStatus,
              })}`}
              label="Export subscriptions (CSV)"
              disabled={reportQuery.isPending || reportQuery.isError || !d || d.kpis.active_subscriptions_count <= 0}
              variant="secondary"
            />
          </div>
        }
      />

      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription className="text-base">Date range drives renewals and revenue cohorts; plan/status filters apply to subscription rows.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div className="space-y-2">
            <Label htmlFor="rr-from" className="text-base">
              From
            </Label>
            <Input
              id="rr-from"
              type="date"
              className="h-11 text-base"
              value={dateFrom}
              onChange={(e) => setFilter({ date_from: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rr-to" className="text-base">
              To
            </Label>
            <Input
              id="rr-to"
              type="date"
              className="h-11 text-base"
              value={dateTo}
              onChange={(e) => setFilter({ date_to: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-base">Company</Label>
            <Select value={companyId || "__all__"} onValueChange={(v) => setFilter({ company_id: v === "__all__" ? "" : v })}>
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
            <Label className="text-base">Plan</Label>
            <Select
              value={subscriptionPlanId || "__all__"}
              onValueChange={(v) => setFilter({ subscription_plan_id: v === "__all__" ? "" : v })}
            >
              <SelectTrigger className="h-11 text-base">
                <SelectValue placeholder="All plans" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-base">
                  All plans
                </SelectItem>
                {(plansQuery.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-base">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-base">Status</Label>
            <Select
              value={subscriptionStatus || "__all__"}
              onValueChange={(v) => setFilter({ subscription_status: v === "__all__" ? "" : v })}
            >
              <SelectTrigger className="h-11 text-base">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-base">
                  All statuses
                </SelectItem>
                {SUB_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-base">
                    {s}
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
                setFilter({
                  date_from: "",
                  date_to: "",
                  company_id: "",
                  subscription_plan_id: "",
                  subscription_status: "",
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
          <p className="text-base">Loading recurring revenue…</p>
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
            <KpiCard title="Active subscriptions" value={String(d.kpis.active_subscriptions_count)} hint={definitions.active} />
            <KpiCard
              title="New subscriptions (period)"
              value={String(d.kpis.new_subscriptions_in_period_count)}
              hint={definitions.new_in_period}
            />
            <KpiCard
              title="Cancelled subscriptions (period)"
              value={String(d.kpis.cancelled_subscriptions_in_period_count)}
              hint={definitions.cancelled_in_period}
            />
            <KpiCard
              title="Cancelled subscriptions (snapshot)"
              value={String(d.kpis.cancelled_subscriptions_snapshot_count)}
              hint={definitions.cancelled_snapshot}
            />
            <KpiCard
              title="MRR (snapshot)"
              value={detail?.mrr?.formatted_gbp ?? "—"}
              hint={definitions.mrr ?? detail?.mrr?.reason}
            />
            <KpiCard title="ARR (derived)" value={detail?.arr?.formatted_gbp ?? "—"} hint={definitions.arr ?? detail?.arr?.reason} />
            <KpiCard
              title="Subscription revenue (billed)"
              value={formatGBP(d.kpis.subscription_invoiced_period_pence)}
              hint={definitions.subscription_invoiced}
            />
            <KpiCard title="One-off revenue (billed)" value={formatGBP(d.kpis.one_off_invoiced_period_pence)} hint={definitions.one_off_invoiced} />
          </div>

          {detail?.placeholder_message ? (
            <Card className="border-primary/20 bg-primary/5 shadow-sm">
              <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
                <Repeat className="mt-0.5 h-4 w-4 text-primary" aria-hidden />
                <div>
                  <div className="font-medium text-foreground">About this report</div>
                  <p className="mt-1 leading-relaxed">{detail.placeholder_message}</p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base">MRR trend</CardTitle>
                <CardDescription className="text-xs">{definitions.mrr_trend}</CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="h-[280px] w-full pt-4 pb-2 sm:h-[300px]">
                {mrrTrend.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No MRR data for this window.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mrrTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={formatPenceTick} width={72} />
                      <RechartsTooltip formatter={(val) => formatPenceTick(val)} />
                      <Legend />
                      <Line type="monotone" dataKey="mrr_pence" name="MRR" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base">ARR trend</CardTitle>
                <CardDescription className="text-xs">Derived as 12 × MRR per month.</CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="h-[280px] w-full pt-4 pb-2 sm:h-[300px]">
                {arrTrend.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No ARR data for this window.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={arrTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={formatPenceTick} width={72} />
                      <RechartsTooltip formatter={(val) => formatPenceTick(val)} />
                      <Legend />
                      <Line type="monotone" dataKey="arr_pence" name="ARR" stroke="hsl(142 76% 36%)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base">Recurring vs one-off (invoiced)</CardTitle>
                <CardDescription className="text-xs">Split of invoice totals by issued date cohort.</CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="h-[280px] w-full pt-4 pb-2 sm:h-[300px]">
                {splitInv.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No invoice activity in this window.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={splitInv} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={formatPenceTick} width={72} />
                      <RechartsTooltip formatter={(val) => formatPenceTick(val)} />
                      <Legend />
                      <Bar dataKey="amount_pence" name="Amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base">Recurring vs one-off (payments)</CardTitle>
                <CardDescription className="text-xs">Split of cash received (paid_at in range).</CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="h-[280px] w-full pt-4 pb-2 sm:h-[300px]">
                {splitPay.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No payment activity in this window.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={splitPay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={formatPenceTick} width={72} />
                      <RechartsTooltip formatter={(val) => formatPenceTick(val)} />
                      <Legend />
                      <Bar dataKey="amount_pence" name="Amount" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Active subscriptions by plan</CardTitle>
                <CardDescription className="text-xs">{definitions.active_by_plan}</CardDescription>
              </CardHeader>
              <CardContent>
                {activeByPlan.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active subscriptions for this filter.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[560px] text-left text-sm">
                      <thead className="border-b bg-muted/40">
                        <tr>
                          <th className="px-3 py-2 font-medium">Plan</th>
                          <th className="px-3 py-2 font-medium text-right">Active</th>
                          <th className="px-3 py-2 font-medium text-right">MRR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeByPlan.map((r) => (
                          <tr key={r.plan_id} className="border-b last:border-0">
                            <td className="px-3 py-2">{r.plan_name}</td>
                            <td className="px-3 py-2 text-right tabular-nums font-medium">{r.active_subscriptions_count}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{r.formatted_mrr}</td>
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
                <CardTitle className="text-base">Upcoming renewals</CardTitle>
                <CardDescription className="text-xs">Subscriptions with renew date inside the selected window.</CardDescription>
              </CardHeader>
              <CardContent>
                {upcoming.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No renewals due in this range.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[680px] text-left text-sm">
                      <thead className="border-b bg-muted/40">
                        <tr>
                          <th className="px-3 py-2 font-medium">Company</th>
                          <th className="px-3 py-2 font-medium">Plan</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                          <th className="px-3 py-2 font-medium">Renews</th>
                        </tr>
                      </thead>
                      <tbody>
                        {upcoming.map((r, idx) => (
                          <tr key={`${r.company_id ?? idx}`} className="border-b last:border-0">
                            <td className="px-3 py-2">{r.company_name ?? "—"}</td>
                            <td className="px-3 py-2">{r.plan_name ?? "—"}</td>
                            <td className="px-3 py-2">
                              <SubscriptionStatusBadge status={r.status} />
                            </td>
                            <td className="px-3 py-2 text-muted-foreground tabular-nums">{r.renews_on ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top subscription customers</CardTitle>
                <CardDescription className="text-xs">Ranked by subscription-tagged invoices issued in the period.</CardDescription>
              </CardHeader>
              <CardContent>
                {topCustomers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No subscription invoicing in this window.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead className="border-b bg-muted/40">
                        <tr>
                          <th className="px-3 py-2 font-medium">Company</th>
                          <th className="px-3 py-2 font-medium text-right">Subscription invoiced</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topCustomers.map((r) => (
                          <tr key={r.company_id} className="border-b last:border-0">
                            <td className="px-3 py-2">{r.company_name ?? "—"}</td>
                            <td className="px-3 py-2 text-right tabular-nums font-medium">{r.formatted}</td>
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
                <CardTitle className="text-base">Overage revenue by company</CardTitle>
                <CardDescription className="text-xs">{definitions.overage_revenue}</CardDescription>
              </CardHeader>
              <CardContent>
                {overageByCompany.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No overage line items in this window.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead className="border-b bg-muted/40">
                        <tr>
                          <th className="px-3 py-2 font-medium">Company</th>
                          <th className="px-3 py-2 font-medium text-right">Overage billed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overageByCompany.map((r) => (
                          <tr key={r.company_id} className="border-b last:border-0">
                            <td className="px-3 py-2">{r.company_name ?? "—"}</td>
                            <td className="px-3 py-2 text-right tabular-nums font-medium">{r.formatted}</td>
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

