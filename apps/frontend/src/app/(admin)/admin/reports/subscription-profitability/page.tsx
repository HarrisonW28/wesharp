"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";

import { Loader2, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { SubscriptionProfitabilityReportResponseSchema } from "@/lib/api/admin-subscription-profitability-report-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

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

function flagRowLabel(row: Record<string, unknown>): string {
  const name = row.company_name;
  if (typeof name === "string" && name.trim() !== "") return name;
  const id = row.company_id;
  return typeof id === "string" ? id.slice(0, 8) + "…" : "—";
}

export default function AdminSubscriptionProfitabilityReportPage() {
  const admin = useAdminApi();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const dateFrom = searchParams.get("date_from") ?? "";
  const dateTo = searchParams.get("date_to") ?? "";
  const companyId = searchParams.get("company_id") ?? "";
  const subscriptionPlanId = searchParams.get("subscription_plan_id") ?? "";

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
      }),
    [companyId, dateFrom, dateTo, subscriptionPlanId],
  );

  const reportQuery = useQuery({
    queryKey: ["admin", "reports", "subscription-profitability", reportQs],
    queryFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/reports/subscription-profitability${reportQs}`);
      if (!res.ok) throw new Error(res.message);
      const parsed = SubscriptionProfitabilityReportResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected subscription profitability payload shape.");
      return parsed.data.data;
    },
  });

  const companiesQuery = useQuery({
    queryKey: ["admin-lookups-companies-subscription-profitability-report"],
    queryFn: async () => {
      const res = await admin.json<unknown>("/api/admin/lookups/companies");
      if (!res.ok) throw new Error(res.message);
      const items = (res.data as { data?: { items?: CompanyOpt[] } })?.data?.items;
      return Array.isArray(items) ? items : [];
    },
  });

  const plansQuery = useQuery({
    queryKey: ["admin-subscription-plans-for-subscription-profitability"],
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
  const kpis = d?.kpis ?? {};
  const companies = Array.isArray(d?.companies) ? d.companies : [];
  const highUsage = d?.flags?.high_usage_customers ?? [];
  const lowMargin = d?.flags?.low_margin_subscription_customers ?? [];

  const subFormatted =
    typeof kpis.formatted_subscription_line_revenue_period === "string"
      ? kpis.formatted_subscription_line_revenue_period
      : "—";
  const ovFormatted =
    typeof kpis.formatted_overage_revenue_period === "string" ? kpis.formatted_overage_revenue_period : "—";
  const marginFormatted =
    typeof kpis.formatted_subscription_margin_estimate_period === "string"
      ? kpis.formatted_subscription_margin_estimate_period
      : "—";

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: "Reporting hub", href: "/admin/reporting" },
          { label: "Subscription profitability" },
        ]}
      />
      <PageHeader
        title="Subscription profitability"
        description="Subscription vs overage invoice lines, covered usage, and cost allocations — Sprint 24.3."
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => reportQuery.refetch()} disabled={reportQuery.isFetching}>
            {reportQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
            <span className="ml-2">Refresh</span>
          </Button>
        }
      />

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Dates default to the current month when omitted.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="spf-from">From</Label>
            <Input
              id="spf-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setFilter({ date_from: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="spf-to">To</Label>
            <Input id="spf-to" type="date" value={dateTo} onChange={(e) => setFilter({ date_to: e.target.value })} />
          </div>
          <div className="space-y-2 sm:col-span-2 xl:col-span-1">
            <Label>Company</Label>
            <Select
              value={companyId === "" ? "__all" : companyId}
              onValueChange={(v) => setFilter({ company_id: v === "__all" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All companies</SelectItem>
                {companiesQuery.data?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.city ? ` · ${c.city}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2 xl:col-span-1">
            <Label>Plan</Label>
            <Select
              value={subscriptionPlanId === "" ? "__all" : subscriptionPlanId}
              onValueChange={(v) => setFilter({ subscription_plan_id: v === "__all" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All plans" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All plans</SelectItem>
                {plansQuery.data?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {reportQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading report…
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Period KPIs</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Distinct subscription customers" value={String(kpis.subscription_customers_distinct ?? "—")} />
          <KpiCard title="Failed-payment subscriptions (scoped)" value={String(kpis.failed_payment_subscriptions_count ?? "—")} />
          <KpiCard title="Renewals due in window" value={String(kpis.renewals_due_in_period_count ?? "—")} />
          <KpiCard
            title="Covered collections / knives (units)"
            value={`${String(kpis.covered_collection_units_in_period ?? "—")} / ${String(kpis.covered_knife_units_in_period ?? "—")}`}
          />
          <KpiCard
            title="Overage collections / knives (units)"
            value={`${String(kpis.overage_collection_units_in_period ?? "—")} / ${String(kpis.overage_knife_units_in_period ?? "—")}`}
          />
          <KpiCard title="Subscription line revenue" value={subFormatted} />
          <KpiCard title="Overage line revenue" value={ovFormatted} />
          <KpiCard title="Portfolio margin estimate (sub + overage − allocated)" value={marginFormatted} hint="Signed GBP; negative means allocated cost exceeded scoped line revenue." />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">High usage (heuristic)</CardTitle>
            <CardDescription>Top slice from the API — inspect allowance burn before renewal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {highUsage.length === 0 ? (
              <p className="text-muted-foreground">No rows flagged for this scope.</p>
            ) : (
              <ul className="space-y-1">
                {highUsage.slice(0, 12).map((row, i) => (
                  <li key={i} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">{flagRowLabel(row)}</span>
                    <Badge variant="secondary">usage</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Low margin estimate</CardTitle>
            <CardDescription>Gross margin heuristic vs subscription + overage lines.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {lowMargin.length === 0 ? (
              <p className="text-muted-foreground">No rows flagged for this scope.</p>
            ) : (
              <ul className="space-y-1">
                {lowMargin.slice(0, 12).map((row, i) => (
                  <li key={i} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">{flagRowLabel(row)}</span>
                    <Badge variant="outline">margin</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Companies ({companies.length})</CardTitle>
            <CardDescription>Sorted by combined subscription economy for the period.</CardDescription>
          </div>
          <Link href="/admin/reports/recurring-revenue" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Recurring revenue report
          </Link>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Company</th>
                <th className="py-2 pr-3 font-medium">Plan</th>
                <th className="py-2 pr-3 font-medium">Sub revenue</th>
                <th className="py-2 pr-3 font-medium">Overage</th>
                <th className="py-2 pr-3 font-medium">Allocated</th>
                <th className="py-2 pr-3 font-medium">Margin est.</th>
                <th className="py-2 font-medium">Flags</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-muted-foreground">
                    No company rows for this filter window.
                  </td>
                </tr>
              ) : (
                companies.slice(0, 40).map((row, idx) => {
                  const rev = row.revenue_pence as Record<string, unknown> | undefined;
                  const flags = row.flags as Record<string, unknown> | undefined;
                  const snap = row.subscription_snapshot as Record<string, unknown> | null | undefined;
                  const planName = typeof snap?.plan_name === "string" ? snap.plan_name : "—";
                  return (
                    <tr key={idx} className="border-b border-border/60">
                      <td className="max-w-[220px] truncate py-2 pr-3">{typeof row.company_name === "string" ? row.company_name : "—"}</td>
                      <td className="py-2 pr-3">{planName}</td>
                      <td className="py-2 pr-3 tabular-nums">{typeof rev?.formatted_subscription_line_items === "string" ? rev.formatted_subscription_line_items : "—"}</td>
                      <td className="py-2 pr-3 tabular-nums">{typeof rev?.formatted_overage_line_items === "string" ? rev.formatted_overage_line_items : "—"}</td>
                      <td className="py-2 pr-3 tabular-nums">{typeof row.formatted_allocated_cost === "string" ? row.formatted_allocated_cost : "—"}</td>
                      <td className="py-2 pr-3 tabular-nums">{typeof row.formatted_gross_margin_estimate === "string" ? row.formatted_gross_margin_estimate : "—"}</td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-1">
                          {flags?.high_usage ? <Badge variant="secondary">high usage</Badge> : null}
                          {flags?.low_margin_estimate ? <Badge variant="outline">low margin</Badge> : null}
                          {flags?.churn_risk ? <Badge variant="destructive">churn risk</Badge> : null}
                          {!flags?.high_usage && !flags?.low_margin_estimate && !flags?.churn_risk ? (
                            <span className="text-muted-foreground">—</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Separator />

      <p className="text-xs leading-relaxed text-muted-foreground">{typeof d?.disclaimer === "string" ? d.disclaimer : ""}</p>
    </div>
  );
}
