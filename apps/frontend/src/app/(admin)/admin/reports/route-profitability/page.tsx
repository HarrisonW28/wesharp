"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";

import { Loader2, RefreshCw, Truck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { RouteProfitabilityReportResponseSchema } from "@/lib/api/admin-route-profitability-report-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const ROUTE_STATUSES = ["draft", "scheduled", "in_progress", "completed", "cancelled"] as const;

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
    <Card className="min-h-[100px] shadow-sm">
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

function formatRate(rate: unknown): string {
  if (rate === null || rate === undefined || typeof rate !== "number" || Number.isNaN(rate)) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}

export default function AdminRouteProfitabilityReportPage() {
  const admin = useAdminApi();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const dateFrom = searchParams.get("date_from") ?? "";
  const dateTo = searchParams.get("date_to") ?? "";
  const routeStatus = searchParams.get("route_status") ?? "";
  const driverUserId = searchParams.get("driver_user_id") ?? "";
  const area = searchParams.get("area") ?? "";
  const failureReason = searchParams.get("failure_reason") ?? "";
  const page = searchParams.get("page") ?? "1";

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
        route_status: routeStatus,
        driver_user_id: driverUserId,
        area,
        failure_reason: failureReason,
        page,
      }),
    [area, dateFrom, dateTo, driverUserId, failureReason, page, routeStatus],
  );

  const reportQuery = useQuery({
    queryKey: ["admin", "reports", "route-profitability", reportQs],
    queryFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/reports/route-profitability${reportQs}`);
      if (!res.ok) throw new Error(res.message);
      const parsed = RouteProfitabilityReportResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected route profitability payload shape.");
      return parsed.data.data;
    },
  });

  useEffect(() => {
    if (reportQuery.isError) toast.error((reportQuery.error as Error).message);
  }, [reportQuery.error, reportQuery.isError]);

  const d = reportQuery.data;
  const kpis = d?.kpis ?? {};
  const drivers = Array.isArray(d?.drivers) ? d.drivers : [];
  const routeRows = d?.routes?.rows ?? [];
  const routeMeta = d?.routes?.meta as Record<string, unknown> | undefined;
  const salesRoute = d?.sales_route as Record<string, unknown> | undefined;

  const curPage = Number(routeMeta?.current_page ?? 1);
  const lastPage = Number(routeMeta?.last_page ?? 1);

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: "Reporting hub", href: "/admin/reporting" },
          { label: "Route profitability" },
        ]}
      />
      <PageHeader
        title="Route profitability"
        description="Sprint 24.4 — route revenue from billable orders, ledger allocations (fuel, consumables, other), stops timing, photo compliance, and driver rollups."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/admin/reports/routes">Route performance</Link>
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => reportQuery.refetch()} disabled={reportQuery.isFetching}>
              {reportQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
              <span className="ml-2">Refresh</span>
            </Button>
          </div>
        }
      />

      {salesRoute?.implemented === false ? (
        <Alert>
          <Truck className="h-4 w-4" aria-hidden />
          <AlertTitle>Sales routes</AlertTitle>
          <AlertDescription>{String(salesRoute.message ?? "Not modelled.")}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>
            Dates apply to route <span className="font-medium">scheduled_date</span>. Allocations use rows whose{" "}
            <span className="font-medium">created_at</span> falls in the same window.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="space-y-2">
            <Label htmlFor="rp-from">From</Label>
            <Input id="rp-from" type="date" value={dateFrom} onChange={(e) => setFilter({ date_from: e.target.value, page: "1" })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rp-to">To</Label>
            <Input id="rp-to" type="date" value={dateTo} onChange={(e) => setFilter({ date_to: e.target.value, page: "1" })} />
          </div>
          <div className="space-y-2">
            <Label>Route status</Label>
            <Select value={routeStatus || "__all__"} onValueChange={(v) => setFilter({ route_status: v === "__all__" ? "" : v, page: "1" })}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                {ROUTE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rp-driver">Driver user ID</Label>
            <Input
              id="rp-driver"
              inputMode="numeric"
              placeholder="e.g. 12"
              value={driverUserId}
              onChange={(e) => setFilter({ driver_user_id: e.target.value.replace(/[^\d]/g, ""), page: "1" })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rp-area">Area (city)</Label>
            <Input id="rp-area" placeholder="coverage_city" value={area} onChange={(e) => setFilter({ area: e.target.value, page: "1" })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rp-fail">Failed reason</Label>
            <Input
              id="rp-fail"
              placeholder="skipped stop failure_reason"
              value={failureReason}
              onChange={(e) => setFilter({ failure_reason: e.target.value, page: "1" })}
            />
          </div>
        </CardContent>
      </Card>

      {reportQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading…
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Cohort KPIs</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Routes" value={String(kpis.routes_count ?? "—")} />
          <KpiCard title="Route revenue (billable orders)" value={String(kpis.formatted_total_route_revenue ?? "—")} />
          <KpiCard title="Allocated cost (ledger)" value={String(kpis.formatted_total_allocated_cost ?? "—")} />
          <KpiCard title="Route margin estimate" value={String(kpis.formatted_total_route_margin ?? "—")} hint="Revenue − allocated route targets in the window." />
        </div>
      </section>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Drivers ({drivers.length})</CardTitle>
          <CardDescription>Stopped after {drivers.length ? "top revenue drivers" : "—"} in this cohort.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Driver</th>
                <th className="py-2 pr-3 font-medium">Routes</th>
                <th className="py-2 pr-3 font-medium">Stops (done / failed)</th>
                <th className="py-2 pr-3 font-medium">Avg stop (min)</th>
                <th className="py-2 pr-3 font-medium">Photo compliance</th>
                <th className="py-2 pr-3 font-medium">Issues</th>
                <th className="py-2 pr-3 font-medium">Revenue</th>
                <th className="py-2 pr-3 font-medium">Allocated</th>
                <th className="py-2 font-medium">Margin</th>
              </tr>
            </thead>
            <tbody>
              {drivers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-muted-foreground">
                    No driver-assigned routes in this cohort.
                  </td>
                </tr>
              ) : (
                drivers.map((row, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-2 pr-3">{typeof row.driver_name === "string" ? row.driver_name : "—"}</td>
                    <td className="py-2 pr-3 tabular-nums">{String(row.routes_assigned_count ?? "—")}</td>
                    <td className="py-2 pr-3 tabular-nums">
                      {String(row.completed_stop_count ?? "—")} / {String(row.failed_stop_count ?? "—")}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{row.average_completion_minutes != null ? String(row.average_completion_minutes) : "—"}</td>
                    <td className="py-2 pr-3 tabular-nums">{formatRate(row.photo_compliance_rate)}</td>
                    <td className="py-2 pr-3 tabular-nums">{String(row.issues_raised_count ?? "—")}</td>
                    <td className="py-2 pr-3 tabular-nums">{String(row.formatted_revenue ?? "—")}</td>
                    <td className="py-2 pr-3 tabular-nums">{String(row.formatted_allocated_cost ?? "—")}</td>
                    <td className="py-2 tabular-nums">{String(row.formatted_route_margin ?? "—")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Routes</CardTitle>
            <CardDescription>Per-route economics and operational quality.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={curPage <= 1} onClick={() => setFilter({ page: String(curPage - 1) })}>
              Previous
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={curPage >= lastPage} onClick={() => setFilter({ page: String(curPage + 1) })}>
              Next
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Route</th>
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Driver</th>
                <th className="py-2 pr-3 font-medium">Stops</th>
                <th className="py-2 pr-3 font-medium">Orders</th>
                <th className="py-2 pr-3 font-medium">Knives</th>
                <th className="py-2 pr-3 font-medium">Revenue</th>
                <th className="py-2 pr-3 font-medium">Allocated</th>
                <th className="py-2 pr-3 font-medium">Margin</th>
                <th className="py-2 pr-3 font-medium">Fuel</th>
                <th className="py-2 pr-3 font-medium">Consumable</th>
                <th className="py-2 pr-3 font-medium">Avg stop</th>
                <th className="py-2 font-medium">Photos</th>
              </tr>
            </thead>
            <tbody>
              {routeRows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-6 text-muted-foreground">
                    No routes for these filters.
                  </td>
                </tr>
              ) : (
                routeRows.map((row, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="max-w-[200px] truncate py-2 pr-3">{typeof row.name === "string" ? row.name : "—"}</td>
                    <td className="py-2 pr-3">{typeof row.scheduled_date === "string" ? row.scheduled_date : "—"}</td>
                    <td className="py-2 pr-3">{typeof row.driver_name === "string" ? row.driver_name : "—"}</td>
                    <td className="py-2 pr-3 tabular-nums">
                      {String(row.completed_stops_count ?? "—")}/{String(row.stops_count ?? "—")}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{String(row.orders_on_route_count ?? "—")}</td>
                    <td className="py-2 pr-3 tabular-nums">{String(row.knives_on_route_count ?? "—")}</td>
                    <td className="py-2 pr-3 tabular-nums">{String(row.formatted_revenue ?? "—")}</td>
                    <td className="py-2 pr-3 tabular-nums">{String(row.formatted_allocated_cost ?? "—")}</td>
                    <td className="py-2 pr-3 tabular-nums">{String(row.formatted_route_margin ?? "—")}</td>
                    <td className="py-2 pr-3 tabular-nums">{String(row.formatted_allocated_fuel ?? "—")}</td>
                    <td className="py-2 pr-3 tabular-nums">{String(row.formatted_allocated_consumable ?? "—")}</td>
                    <td className="py-2 pr-3 tabular-nums">{row.average_stop_minutes != null ? String(row.average_stop_minutes) : "—"}</td>
                    <td className="py-2 tabular-nums">{formatRate(row.photo_compliance_rate)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted-foreground">
            Page {curPage} of {lastPage}
          </p>
        </CardContent>
      </Card>

      <Separator />

      <details className="rounded-xl border bg-card p-4 text-sm shadow-sm">
        <summary className="cursor-pointer font-medium text-foreground">Definitions</summary>
        <dl className="mt-3 space-y-2 text-muted-foreground">
          {Object.entries((d?.definitions as Record<string, string>) ?? {}).map(([k, v]) => (
            <div key={k}>
              <dt className="font-medium text-foreground">{k.replace(/_/g, " ")}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </details>

      <p className="text-xs leading-relaxed text-muted-foreground">{typeof d?.disclaimer === "string" ? d.disclaimer : ""}</p>
    </div>
  );
}
