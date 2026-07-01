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

import { RoutePerformanceReportResponseSchema } from "@/lib/api/admin-route-performance-report-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";

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

const ROUTE_STATUSES = ["draft", "scheduled", "in_progress", "completed", "cancelled"] as const;

function buildQs(params: Record<string, string>): string {
  const u = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== "") u.set(k, v);
  });
  const s = u.toString();
  return s ? `?${s}` : "";
}

function formatRate(rate: number | null | undefined): string {
  if (rate === null || rate === undefined || Number.isNaN(rate)) return "—";
  return `${(rate * 100).toFixed(1)}%`;
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

function TablePagination(props: {
  meta: { current_page?: number; last_page?: number; total?: number } | undefined;
  onPage: (p: number) => void;
}) {
  const cur = Number(props.meta?.current_page ?? 1);
  const last = Number(props.meta?.last_page ?? 1);
  const total = Number(props.meta?.total ?? 0);
  if (last <= 1 && total === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
      <span>
        Page {cur} of {last}
        {total > 0 ? ` · ${total} routes` : ""}
      </span>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" disabled={cur <= 1} onClick={() => props.onPage(cur - 1)}>
          Previous
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={cur >= last} onClick={() => props.onPage(cur + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

export default function AdminRoutePerformanceReportPage() {
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

  const routesExportQs = useMemo(
    () =>
      buildQs({
        date_from: dateFrom,
        date_to: dateTo,
        route_status: routeStatus,
        driver_user_id: driverUserId,
        area,
        failure_reason: failureReason,
      }),
    [area, dateFrom, dateTo, driverUserId, failureReason, routeStatus],
  );

  const reportQuery = useQuery({
    queryKey: ["admin-route-performance-report", reportQs],
    queryFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/reports/routes${reportQs}`);
      if (!res.ok) throw new Error(res.message);
      const parsed = RoutePerformanceReportResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected routes report payload.");
      return parsed.data.data;
    },
  });

  useEffect(() => {
    if (reportQuery.isError) toast.error((reportQuery.error as Error).message);
  }, [reportQuery.error, reportQuery.isError]);

  const d = reportQuery.data;

  const hasRoutesSeries = (d?.series.routes_by_day.length ?? 0) > 0;
  const hasFailedReasons = (d?.series.failed_collection_reasons.length ?? 0) > 0;
  const hasStopStatus = (d?.series.stop_status_breakdown ?? []).some((r) => r.count > 0);
  const hasDrivers = (d?.series.driver_performance ?? []).some((r) => r.routes_count > 0);

  return (
    <div className="space-y-8">
      <NavBreadcrumbs />
      <PageHeader
        title="Route performance"
        description="Stop throughput, failures, and completion quality for routes scheduled in the selected window."
        actions={
          <ReportCsvExportButton
            admin={admin}
            exportPath={`/api/admin/reports/exports/routes.csv${routesExportQs}`}
            label="Export routes (CSV)"
            disabled={
              reportQuery.isPending || reportQuery.isError || !d || d.kpis.routes_count <= 0
            }
          />
        }
      />

      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription className="text-base">
            Date range applies to route <span className="font-medium">scheduled_date</span> (inclusive).{" "}
            <span className="font-medium">Area</span> matches <span className="font-medium">coverage_city</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="space-y-2">
            <Label htmlFor="rr-from" className="text-base">
              From
            </Label>
            <Input
              id="rr-from"
              type="date"
              className="h-11 text-base"
              value={dateFrom}
              onChange={(e) => setFilter({ date_from: e.target.value, page: "1" })}
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
              onChange={(e) => setFilter({ date_to: e.target.value, page: "1" })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-base">Route status</Label>
            <Select
              value={routeStatus || "__all__"}
              onValueChange={(v) => setFilter({ route_status: v === "__all__" ? "" : v, page: "1" })}
            >
              <SelectTrigger className="h-11 text-base">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-base">
                  All
                </SelectItem>
                {ROUTE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-base">
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rr-driver" className="text-base">
              Driver user ID
            </Label>
            <Input
              id="rr-driver"
              inputMode="numeric"
              className="h-11 text-base"
              placeholder="e.g. 12"
              value={driverUserId}
              onChange={(e) => setFilter({ driver_user_id: e.target.value.replace(/[^\d]/g, ""), page: "1" })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rr-area" className="text-base">
              Area (city)
            </Label>
            <Input
              id="rr-area"
              className="h-11 text-base"
              placeholder="Exact coverage_city match"
              value={area}
              onChange={(e) => setFilter({ area: e.target.value, page: "1" })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rr-fail" className="text-base">
              Failed reason (exact)
            </Label>
            <Input
              id="rr-fail"
              className="h-11 text-base"
              placeholder="Matches skipped stop failure_reason"
              value={failureReason}
              onChange={(e) => setFilter({ failure_reason: e.target.value, page: "1" })}
            />
          </div>
          <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-3 xl:col-span-6">
            <Button
              type="button"
              variant="outline"
              className="text-base"
              onClick={() => {
                setFilter({
                  date_from: "",
                  date_to: "",
                  route_status: "",
                  driver_user_id: "",
                  area: "",
                  failure_reason: "",
                  page: "1",
                });
              }}
            >
              Clear
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
          <p className="text-base">Loading route performance…</p>
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
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4">
            <KpiCard title="Routes (cohort)" value={String(d.kpis.routes_count)} hint="scheduled_date in range" />
            <KpiCard title="Routes completed" value={String(d.kpis.routes_completed_count)} hint="route_status" />
            <KpiCard title="Total stops" value={String(d.kpis.total_stops)} />
            <KpiCard title="Completed stops" value={String(d.kpis.completed_stops)} />
            <KpiCard title="Failed collections" value={String(d.kpis.failed_collections)} hint="skipped stops" />
            <KpiCard title="Stop completion rate" value={formatRate(d.kpis.completion_rate)} hint="completed ÷ total" />
            <KpiCard title="Avg stops / route" value={d.kpis.average_stops_per_route?.toFixed(2) ?? "—"} />
            <KpiCard title="Photos captured" value={String(d.kpis.photos_captured_count)} hint="active evidence on stops" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base">Routes scheduled per day</CardTitle>
                <CardDescription className="text-xs">Count of routes by scheduled_date.</CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="h-[280px] w-full pt-4 pb-2 sm:h-[300px]">
                {!hasRoutesSeries ? (
                  <p className="text-sm text-muted-foreground">No routes in this window.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={d.series.routes_by_day} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="count" name="Routes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base">Failed collection reasons</CardTitle>
                <CardDescription className="text-xs">Top skipped-stop failure_reason values (max 50).</CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="h-[280px] w-full pt-4 pb-2 sm:h-[300px]">
                {!hasFailedReasons ? (
                  <p className="text-sm text-muted-foreground">No failed collections with a recorded reason.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={d.series.failed_collection_reasons.map((r) => ({
                        label: r.reason.length > 48 ? `${r.reason.slice(0, 48)}…` : r.reason,
                        count: r.count,
                      }))}
                      layout="vertical"
                      margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="label" width={200} tick={{ fontSize: 10 }} />
                      <RechartsTooltip />
                      <Bar dataKey="count" name="Stops" fill="hsl(0 84% 45%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Stops by status</CardTitle>
                <CardDescription className="text-xs">All stops on routes in cohort.</CardDescription>
              </CardHeader>
              <CardContent>
                {!hasStopStatus ? (
                  <p className="text-sm text-muted-foreground">No stops for routes in this window.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[360px] text-left text-sm">
                      <thead className="border-b bg-muted/40">
                        <tr>
                          <th className="px-3 py-2 font-medium">Status</th>
                          <th className="px-3 py-2 font-medium text-right">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.series.stop_status_breakdown.map((row) => (
                          <tr key={row.status} className="border-b last:border-0">
                            <td className="px-3 py-2">
                              <StatusBadge kind="route_stop" status={row.status} />
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">{row.count}</td>
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
                <CardTitle className="text-base">Driver performance (rollup)</CardTitle>
                <CardDescription className="text-xs">
                  Grouped by routes.driver_user_id. Unassigned routes appear as “—”.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!hasDrivers ? (
                  <p className="text-sm text-muted-foreground">No driver rollups for this filter.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[520px] text-left text-sm">
                      <thead className="border-b bg-muted/40">
                        <tr>
                          <th className="px-3 py-2 font-medium">Driver</th>
                          <th className="px-3 py-2 font-medium text-right">Routes</th>
                          <th className="px-3 py-2 font-medium text-right">Stops</th>
                          <th className="px-3 py-2 font-medium text-right">Stops completed</th>
                          <th className="px-3 py-2 font-medium text-right">Completion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.series.driver_performance.map((row) => {
                          const rate = row.stops_count > 0 ? row.completed_stops / row.stops_count : null;
                          return (
                            <tr key={String(row.driver_user_id ?? "unassigned")} className="border-b last:border-0">
                              <td className="px-3 py-2 tabular-nums text-muted-foreground">
                                {row.driver_user_id === null ? "—" : String(row.driver_user_id)}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">{row.routes_count}</td>
                              <td className="px-3 py-2 text-right tabular-nums">{row.stops_count}</td>
                              <td className="px-3 py-2 text-right tabular-nums">{row.completed_stops}</td>
                              <td className="px-3 py-2 text-right tabular-nums font-medium">{formatRate(rate)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Route status breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {d.series.route_status_breakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">No routes in cohort.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[320px] text-left text-sm">
                    <thead className="border-b bg-muted/40">
                      <tr>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium text-right">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.series.route_status_breakdown.map((row) => (
                        <tr key={row.status} className="border-b last:border-0">
                          <td className="px-3 py-2">
                            <StatusBadge kind="route" status={row.status} />
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{row.count}</td>
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
              <CardTitle className="text-base">Route performance table</CardTitle>
              <CardDescription className="text-xs">Paginated list of routes in cohort.</CardDescription>
            </CardHeader>
            <CardContent>
              {!d.table || d.table.rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No routes in this window.</p>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead className="border-b bg-muted/40">
                        <tr>
                          <th className="px-3 py-2 font-medium">Route</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                          <th className="px-3 py-2 font-medium">Date</th>
                          <th className="px-3 py-2 font-medium">City</th>
                          <th className="px-3 py-2 font-medium text-right">Stops</th>
                          <th className="px-3 py-2 font-medium text-right">Done</th>
                          <th className="px-3 py-2 font-medium text-right">Failed</th>
                          <th className="px-3 py-2 font-medium text-right">Rate</th>
                          <th className="px-3 py-2 font-medium text-right">Photos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.table.rows.map((row) => (
                          <tr key={String(row.id)} className="border-b last:border-0">
                            <td className="px-3 py-2">
                              <Link href={`/admin/routes/${String(row.id)}`} className="font-medium text-primary underline">
                                {String(row.name ?? row.id)}
                              </Link>
                            </td>
                            <td className="px-3 py-2">
                              <StatusBadge kind="route" status={String(row.route_status ?? "")} />
                            </td>
                            <td className="px-3 py-2 tabular-nums text-muted-foreground">{String(row.scheduled_date ?? "—")}</td>
                            <td className="px-3 py-2">{String(row.coverage_city ?? "—")}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{String(row.stops_count ?? 0)}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{String(row.completed_stops_count ?? 0)}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{String(row.failed_collections_count ?? 0)}</td>
                            <td className="px-3 py-2 text-right tabular-nums font-medium">
                              {formatRate(typeof row.completion_rate === "number" ? row.completion_rate : null)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">{String(row.photos_captured_count ?? 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <TablePagination
                    meta={d.table.meta as { current_page?: number; last_page?: number; total?: number }}
                    onPage={(p) => setFilter({ page: String(p) })}
                  />
                </>
              )}
            </CardContent>
          </Card>

          <details className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
            <summary className="cursor-pointer font-medium text-foreground">Metric definitions</summary>
            <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
              {Object.entries(d.definitions).map(([k, v]) => (
                <li key={k}>
                  <span className="font-mono text-xs">{k}</span>: {v}
                </li>
              ))}
            </ul>
          </details>
        </>
      ) : null}
    </div>
  );
}
