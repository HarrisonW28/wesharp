"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";

import { Loader2, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { SalesPosPerformanceReportResponseSchema } from "@/lib/api/admin-sales-pos-performance-report-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";

import { useBackendMe } from "@/hooks/use-backend-me";

import { NavBreadcrumbs } from "@/components/layout/NavBreadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

type SalesStaffOpt = { id: string; name: string; email?: string | null };

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

function strVal(v: unknown): string {
  if (typeof v === "string" || typeof v === "number") return String(v);
  return "—";
}

export default function AdminSalesPosPerformanceReportPage() {
  const admin = useAdminApi();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: meData } = useBackendMe();

  const viewerRole = meData?.data?.user?.role ?? "";
  const showSalesUserFilter = viewerRole !== "sales";

  const dateFrom = searchParams.get("date_from") ?? "";
  const dateTo = searchParams.get("date_to") ?? "";
  const salesUserId = searchParams.get("sales_user_id") ?? "";

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
        sales_user_id: showSalesUserFilter ? salesUserId : "",
      }),
    [dateFrom, dateTo, salesUserId, showSalesUserFilter],
  );

  const reportQuery = useQuery({
    queryKey: ["admin", "reports", "sales-performance", reportQs],
    queryFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/reports/sales-performance${reportQs}`);
      if (!res.ok) throw new Error(res.message);
      const parsed = SalesPosPerformanceReportResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected sales / POS performance payload shape.");
      return parsed.data.data;
    },
  });

  const salesStaffQuery = useQuery({
    enabled: showSalesUserFilter,
    queryKey: ["admin-lookups-sales-staff-sales-performance"],
    queryFn: async () => {
      const res = await admin.json<unknown>("/api/admin/lookups/sales-staff");
      if (!res.ok) throw new Error(res.message);
      const items = (res.data as { data?: { items?: SalesStaffOpt[] } })?.data?.items;
      return Array.isArray(items) ? items : [];
    },
  });

  useEffect(() => {
    if (reportQuery.isError) toast.error((reportQuery.error as Error).message);
  }, [reportQuery.error, reportQuery.isError]);

  const d = reportQuery.data;
  const kpis = d?.kpis ?? {};
  const filters = d?.filters_applied;
  const leaderboard = Array.isArray(d?.sales_user_performance) ? d.sales_user_performance : [];
  const followUps = d?.sales_follow_ups as Record<string, unknown> | undefined;

  return (
    <div className="space-y-8">
      <NavBreadcrumbs suffix={[{ label: "Sales & POS performance" }]} />
      <PageHeader
        title="Sales & POS performance"
        description="Checkout funnel, POS-like payments, discounts, booking estimates, allocated costs, and sales attribution — Sprint 24.5."
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
          <CardDescription>Dates default to roughly the last 90 days when omitted (see API). Finance and admins can narrow to one sales user.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="spp-from">From</Label>
            <Input id="spp-from" type="date" value={dateFrom} onChange={(e) => setFilter({ date_from: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="spp-to">To</Label>
            <Input id="spp-to" type="date" value={dateTo} onChange={(e) => setFilter({ date_to: e.target.value })} />
          </div>
          {showSalesUserFilter ? (
            <div className="space-y-2 sm:col-span-2 xl:col-span-2">
              <Label>Sales user</Label>
              <Select value={salesUserId === "" ? "__all" : salesUserId} onValueChange={(v) => setFilter({ sales_user_id: v === "__all" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="All sales staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All sales staff</SelectItem>
                  {salesStaffQuery.data?.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                      {u.email ? ` · ${u.email}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2 text-sm text-muted-foreground sm:col-span-2 xl:col-span-2">You are viewing your own sales attribution scope only.</div>
          )}
        </CardContent>
      </Card>

      {filters?.viewer_scope ? (
        <p className="text-xs text-muted-foreground">
          Viewer scope: <span className="font-medium text-foreground">{filters.viewer_scope}</span>
          {filters.sales_user_id ? (
            <>
              {" "}
              · Sales user filter: <span className="font-medium text-foreground">{filters.sales_user_id}</span>
            </>
          ) : null}
        </p>
      ) : null}

      {typeof d?.sales_user_performance_scope_note === "string" && d.sales_user_performance_scope_note ? (
        <p className="text-sm text-muted-foreground">{d.sales_user_performance_scope_note}</p>
      ) : null}

      {reportQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading report…
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Sales-attributed touchpoints</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Sales-created bookings (distinct)" value={strVal(kpis.sales_created_bookings_distinct_count)} />
          <KpiCard title="Sales-created orders (distinct)" value={strVal(kpis.sales_created_orders_distinct_count)} />
          <KpiCard title="Companies created (sales staff)" value={strVal(kpis.companies_created_by_sales_staff_count)} />
          <KpiCard title="Portal self-registrations" value={strVal(kpis.companies_self_registered_portal_count)} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Checkout & recovery</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Checkout attempts — pending" value={strVal(kpis.stripe_checkout_attempts_pending)} />
          <KpiCard title="Checkout attempts — completed" value={strVal(kpis.stripe_checkout_attempts_completed)} />
          <KpiCard
            title="Checkout attempts — expired (abandon proxy)"
            value={strVal(kpis.stripe_checkout_attempts_expired)}
            hint="Roadmap abandonment proxy until distinct statuses ship."
          />
          <KpiCard title="Recovered invoices (post-expiry)" value={strVal(kpis.recovered_checkout_invoices_count)} />
          <KpiCard title="Recovery rate" value={strVal(kpis.checkout_recovery_rate)} />
          <KpiCard title="Recovered checkout revenue" value={strVal(kpis.formatted_recovered_checkout_revenue)} />
          <KpiCard title="Sales follow-ups dispatched" value={strVal(followUps?.dispatched_in_period_count)} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">POS-like payments & discounts</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="POS-like payments (count)" value={strVal(kpis.pos_like_payment_count)} hint="Cash / other staff-recorded payments in window." />
          <KpiCard title="POS-like revenue" value={strVal(kpis.formatted_pos_like_revenue)} />
          <KpiCard title="Avg POS-like payment" value={strVal(kpis.formatted_average_pos_like_payment)} />
          <KpiCard title="Scoped order discounts" value={strVal(kpis.formatted_scoped_orders_discount_total)} />
          <KpiCard title="Booking estimates (sum)" value={strVal(kpis.formatted_booking_price_estimate_total)} hint="price_estimate_pence on attributed bookings." />
          <KpiCard title="Allocated cost (scoped orders & invoices)" value={strVal(kpis.formatted_allocated_cost_to_scoped_orders_and_invoices)} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Discount reasons</CardTitle>
            <CardDescription>Scoped orders with manual discount lines.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(() => {
              const breakdown = (d?.discounts as { reason_breakdown?: { reason?: string; formatted_discount?: string }[] } | undefined)?.reason_breakdown;
              if (!Array.isArray(breakdown) || breakdown.length === 0) {
                return <p className="text-muted-foreground">No discount buckets for this scope.</p>;
              }
              return (
                <ul className="space-y-1">
                  {breakdown.slice(0, 16).map((row, i) => (
                    <li key={i} className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate">{typeof row.reason === "string" ? row.reason : "—"}</span>
                      <Badge variant="secondary">{typeof row.formatted_discount === "string" ? row.formatted_discount : "—"}</Badge>
                    </li>
                  ))}
                </ul>
              );
            })()}
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Definitions</CardTitle>
            <CardDescription>How the API labels each block.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[280px] space-y-2 overflow-y-auto text-xs leading-relaxed text-muted-foreground">
            {d?.definitions && typeof d.definitions === "object"
              ? Object.entries(d.definitions).map(([k, text]) => (
                  <p key={k}>
                    <span className="font-medium text-foreground">{k}</span>: {text}
                  </p>
                ))
              : null}
          </CardContent>
        </Card>
      </section>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Sales staff leaderboard</CardTitle>
            <CardDescription>Sorted by POS-like revenue recorded (window).</CardDescription>
          </div>
          <Link href="/admin/reports/sales" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Legacy sales report
          </Link>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Bookings</th>
                <th className="py-2 pr-3 font-medium">Orders</th>
                <th className="py-2 pr-3 font-medium">Companies</th>
                <th className="py-2 font-medium">POS-like revenue</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-muted-foreground">
                    No leaderboard rows (scoped user or empty window).
                  </td>
                </tr>
              ) : (
                leaderboard.slice(0, 40).map((row, idx) => (
                  <tr key={idx} className="border-b border-border/60">
                    <td className="max-w-[220px] truncate py-2 pr-3">{typeof row.sales_user_name === "string" ? row.sales_user_name : "—"}</td>
                    <td className="py-2 pr-3 tabular-nums">{strVal(row.bookings_created_count)}</td>
                    <td className="py-2 pr-3 tabular-nums">{strVal(row.orders_created_count)}</td>
                    <td className="py-2 pr-3 tabular-nums">{strVal(row.companies_created_count)}</td>
                    <td className="py-2 tabular-nums">{typeof row.formatted_pos_like_revenue === "string" ? row.formatted_pos_like_revenue : "—"}</td>
                  </tr>
                ))
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
