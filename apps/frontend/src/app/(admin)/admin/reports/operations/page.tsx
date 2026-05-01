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

import {
  BookingsReportResponseSchema,
  OrdersReportResponseSchema,
} from "@/lib/api/admin-operations-report-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { formatGBP } from "@/lib/format/money";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
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

const BOOKING_STATUSES = [
  "requested",
  "confirmed",
  "assigned_to_route",
  "collected",
  "in_sharpening",
  "quality_checked",
  "returned",
  "completed",
  "converted_to_order",
  "cancelled",
  "no_show",
] as const;

const ORDER_STATUSES = [
  "draft",
  "received",
  "inspection",
  "in_progress",
  "quality_check",
  "completed",
  "invoiced",
  "returned",
  "cancelled",
] as const;

function buildQs(params: Record<string, string>): string {
  const u = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== "") u.set(k, v);
  });
  const s = u.toString();
  return s ? `?${s}` : "";
}

function formatOptionalHours(h: number | null | undefined): string {
  if (h === null || h === undefined || Number.isNaN(h)) return "—";
  if (h < 1) return `${Math.round(h * 60)}m avg`;
  return `${h.toFixed(1)}h avg`;
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

function ReportWait(props: { label: string }) {
  return (
    <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-xl border bg-card text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
      <p className="text-sm">{props.label}</p>
    </div>
  );
}

function ReportErr(props: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
      <AlertCircle className="h-8 w-8 text-destructive" aria-hidden />
      <p className="text-sm text-destructive">{props.message}</p>
      <Button type="button" size="sm" onClick={() => void props.onRetry()}>
        Retry
      </Button>
    </div>
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
        {total > 0 ? ` · ${total} rows` : ""}
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

export default function AdminOperationsReportsPage() {
  const admin = useAdminApi();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const dateFrom = searchParams.get("date_from") ?? "";
  const dateTo = searchParams.get("date_to") ?? "";
  const companyId = searchParams.get("company_id") ?? "";
  const bookingStatus = searchParams.get("booking_status") ?? "";
  const orderStatus = searchParams.get("order_status") ?? "";
  const bookingsPage = searchParams.get("bookings_page") ?? "1";
  const ordersPage = searchParams.get("orders_page") ?? "1";

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

  const bookingsQs = useMemo(
    () =>
      buildQs({
        date_from: dateFrom,
        date_to: dateTo,
        company_id: companyId,
        booking_status: bookingStatus,
        bookings_page: bookingsPage,
      }),
    [bookingStatus, bookingsPage, companyId, dateFrom, dateTo],
  );

  const ordersQs = useMemo(
    () =>
      buildQs({
        date_from: dateFrom,
        date_to: dateTo,
        company_id: companyId,
        order_status: orderStatus,
        orders_page: ordersPage,
      }),
    [companyId, dateFrom, dateTo, orderStatus, ordersPage],
  );

  const bookingsQuery = useQuery({
    queryKey: ["admin-bookings-report", bookingsQs],
    queryFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/reports/bookings${bookingsQs}`);
      if (!res.ok) throw new Error(res.message);
      const parsed = BookingsReportResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected bookings report payload.");
      return parsed.data.data;
    },
  });

  const ordersQuery = useQuery({
    queryKey: ["admin-orders-report", ordersQs],
    queryFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/reports/orders${ordersQs}`);
      if (!res.ok) throw new Error(res.message);
      const parsed = OrdersReportResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected orders report payload.");
      return parsed.data.data;
    },
  });

  const companiesQuery = useQuery({
    queryKey: ["admin-lookups-companies-operations-report"],
    queryFn: async () => {
      const res = await admin.json<unknown>("/api/admin/lookups/companies");
      if (!res.ok) throw new Error(res.message);
      const items = (res.data as { data?: { items?: CompanyOpt[] } })?.data?.items;
      return Array.isArray(items) ? items : [];
    },
  });

  useEffect(() => {
    if (bookingsQuery.isError) toast.error((bookingsQuery.error as Error).message);
  }, [bookingsQuery.error, bookingsQuery.isError]);

  useEffect(() => {
    if (ordersQuery.isError) toast.error((ordersQuery.error as Error).message);
  }, [ordersQuery.error, ordersQuery.isError]);

  const b = bookingsQuery.data;
  const o = ordersQuery.data;

  const hasBookingsSeries = (b?.series.bookings_by_day.length ?? 0) > 0;
  const hasBookingStatus = (b?.series.booking_status_breakdown ?? []).some((r) => r.count > 0);
  const hasOrdersSeries = (o?.series.orders_by_day.length ?? 0) > 0;
  const hasOrderStatus = (o?.series.order_status_breakdown ?? []).some((r) => r.count > 0);

  const loadingBoth = bookingsQuery.isPending && ordersQuery.isPending;

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Operations reports", href: "/admin/reports/operations" },
        ]}
      />
      <PageHeader
        title="Booking & order throughput"
        description="Operational KPIs from live bookings and orders. Date range applies to cohorts noted in each card; pipeline snapshots ignore dates (see definitions)."
      />

      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription className="text-base">
            Shared date range and company. Status filters apply only to their section&apos;s API call.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="space-y-2">
            <Label htmlFor="op-from" className="text-base">
              From
            </Label>
            <Input
              id="op-from"
              type="date"
              className="h-11 text-base"
              value={dateFrom}
              onChange={(e) =>
                setFilter({ date_from: e.target.value, bookings_page: "1", orders_page: "1" })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="op-to" className="text-base">
              To
            </Label>
            <Input
              id="op-to"
              type="date"
              className="h-11 text-base"
              value={dateTo}
              onChange={(e) =>
                setFilter({ date_to: e.target.value, bookings_page: "1", orders_page: "1" })
              }
            />
          </div>
          <div className="space-y-2">
            <Label className="text-base">Company</Label>
            <Select
              value={companyId || "__all__"}
              onValueChange={(v) =>
                setFilter({ company_id: v === "__all__" ? "" : v, bookings_page: "1", orders_page: "1" })
              }
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
            <Label className="text-base">Booking status</Label>
            <Select
              value={bookingStatus || "__all__"}
              onValueChange={(v) =>
                setFilter({ booking_status: v === "__all__" ? "" : v, bookings_page: "1" })
              }
            >
              <SelectTrigger className="h-11 text-base">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-base">
                  All
                </SelectItem>
                {BOOKING_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-base">
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-base">Order status</Label>
            <Select
              value={orderStatus || "__all__"}
              onValueChange={(v) =>
                setFilter({ order_status: v === "__all__" ? "" : v, orders_page: "1" })
              }
            >
              <SelectTrigger className="h-11 text-base">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-base">
                  All
                </SelectItem>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-base">
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="text-base"
              onClick={() => {
                setFilter({
                  date_from: "",
                  date_to: "",
                  company_id: "",
                  booking_status: "",
                  order_status: "",
                  bookings_page: "1",
                  orders_page: "1",
                });
              }}
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="text-base"
              onClick={() => {
                void bookingsQuery.refetch();
                void ordersQuery.refetch();
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {loadingBoth ? (
        <ReportWait label="Loading operational reports…" />
      ) : (
        <>
          <section className="space-y-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-xl font-semibold">Bookings</h2>
              {bookingsQuery.isFetching && !bookingsQuery.isPending ? (
                <span className="text-xs text-muted-foreground">Updating…</span>
              ) : null}
            </div>

            {bookingsQuery.isPending ? (
              <ReportWait label="Loading bookings report…" />
            ) : bookingsQuery.isError ? (
              <ReportErr message={(bookingsQuery.error as Error).message} onRetry={bookingsQuery.refetch} />
            ) : b ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4">
                  <KpiCard title="Created (cohort)" value={String(b.kpis.bookings_created_count)} hint="created_at in range" />
                  <KpiCard
                    title="Confirmed (activity)"
                    value={String(b.kpis.bookings_confirmed_activity_count)}
                    hint="status confirmed, updated in range"
                  />
                  <KpiCard
                    title="Confirmed (audit)"
                    value={String(b.kpis.bookings_confirmed_audit_count)}
                    hint="booking.confirmed events"
                  />
                  <KpiCard title="Cancelled" value={String(b.kpis.bookings_cancelled_count)} hint="updated in range" />
                  <KpiCard title="Converted to order" value={String(b.kpis.bookings_converted_to_order_count)} />
                  <KpiCard title="Completed" value={String(b.kpis.bookings_completed_count)} />
                  <KpiCard
                    title="Pending pipeline"
                    value={String(b.kpis.pending_bookings_pipeline_count)}
                    hint="snapshot — not date-scoped"
                  />
                  <KpiCard
                    title="Avg time to confirm"
                    value={formatOptionalHours(b.kpis.average_hours_to_confirm)}
                    hint="from audit trail"
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="overflow-hidden">
                    <CardHeader>
                      <CardTitle className="text-base">Bookings created per day</CardTitle>
                      <CardDescription className="text-xs">Cohort by created_at.</CardDescription>
                    </CardHeader>
                    <Separator />
                    <CardContent className="h-[280px] w-full pt-4 pb-2 sm:h-[300px]">
                      {!hasBookingsSeries ? (
                        <p className="text-sm text-muted-foreground">No bookings created in this window.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={b.series.bookings_by_day} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                            <RechartsTooltip />
                            <Legend />
                            <Bar dataKey="count" name="Bookings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Recent booking activity</CardTitle>
                      <CardDescription className="text-xs">Newest in cohort.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {b.recent_activity.rows.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No rows for this filter.</p>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border">
                          <table className="w-full min-w-[320px] text-left text-sm">
                            <thead className="border-b bg-muted/40">
                              <tr>
                                <th className="px-3 py-2 font-medium">Booking</th>
                                <th className="px-3 py-2 font-medium">Status</th>
                                <th className="px-3 py-2 font-medium">Company</th>
                              </tr>
                            </thead>
                            <tbody>
                              {b.recent_activity.rows.map((row) => (
                                <tr key={String(row.id)} className="border-b last:border-0">
                                  <td className="px-3 py-2">
                                    <Link href={`/admin/bookings/${String(row.id)}`} className="text-primary underline">
                                      {String(row.id).slice(0, 8)}…
                                    </Link>
                                  </td>
                                  <td className="px-3 py-2">
                                    <StatusBadge kind="booking" status={String(row.booking_status ?? "")} />
                                  </td>
                                  <td className="px-3 py-2 text-muted-foreground">{String(row.company_name ?? "—")}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Booking status breakdown</CardTitle>
                    <CardDescription className="text-xs">Shares of bookings created in range.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!hasBookingStatus ? (
                      <p className="text-sm text-muted-foreground">No bookings in this cohort.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full min-w-[400px] text-left text-sm">
                          <thead className="border-b bg-muted/40">
                            <tr>
                              <th className="px-3 py-2 font-medium">Status</th>
                              <th className="px-3 py-2 font-medium text-right">Count</th>
                              <th className="px-3 py-2 font-medium text-right">Est. value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {b.series.booking_status_breakdown.map((row) => (
                              <tr key={row.status} className="border-b last:border-0">
                                <td className="px-3 py-2">
                                  <StatusBadge kind="booking" status={row.status} />
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums">{row.count}</td>
                                <td className="px-3 py-2 text-right tabular-nums font-medium">
                                  {formatGBP(row.price_estimate_pence_sum)}
                                </td>
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
                    <CardTitle className="text-base">Booking detail (paginated)</CardTitle>
                    <CardDescription className="text-xs">Cohort list, newest first.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!b.table || b.table.rows.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No bookings in this cohort.</p>
                    ) : (
                      <>
                        <div className="overflow-x-auto rounded-lg border">
                          <table className="w-full min-w-[360px] text-left text-sm">
                            <thead className="border-b bg-muted/40">
                              <tr>
                                <th className="px-3 py-2 font-medium">ID</th>
                                <th className="px-3 py-2 font-medium">Status</th>
                                <th className="px-3 py-2 font-medium">Scheduled</th>
                                <th className="px-3 py-2 font-medium">Company</th>
                              </tr>
                            </thead>
                            <tbody>
                              {b.table.rows.map((row) => (
                                <tr key={String(row.id)} className="border-b last:border-0">
                                  <td className="px-3 py-2">
                                    <Link href={`/admin/bookings/${String(row.id)}`} className="text-primary underline">
                                      {String(row.id).slice(0, 8)}…
                                    </Link>
                                  </td>
                                  <td className="px-3 py-2">
                                    <StatusBadge kind="booking" status={String(row.booking_status ?? "")} />
                                  </td>
                                  <td className="px-3 py-2 tabular-nums text-muted-foreground">
                                    {String(row.scheduled_date ?? "—")}
                                  </td>
                                  <td className="px-3 py-2">{String(row.company_name ?? "—")}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <TablePagination
                          meta={b.table.meta as { current_page?: number; last_page?: number; total?: number }}
                          onPage={(p) => setFilter({ bookings_page: String(p) })}
                        />
                      </>
                    )}
                  </CardContent>
                </Card>

                <details className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
                  <summary className="cursor-pointer font-medium text-foreground">Booking metric definitions</summary>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
                    {Object.entries(b.definitions).map(([k, v]) => (
                      <li key={k}>
                        <span className="font-mono text-xs">{k}</span>: {v}
                      </li>
                    ))}
                  </ul>
                </details>
              </>
            ) : null}
          </section>

          <Separator />

          <section className="space-y-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-xl font-semibold">Orders</h2>
              {ordersQuery.isFetching && !ordersQuery.isPending ? (
                <span className="text-xs text-muted-foreground">Updating…</span>
              ) : null}
            </div>

            {ordersQuery.isPending ? (
              <ReportWait label="Loading orders report…" />
            ) : ordersQuery.isError ? (
              <ReportErr message={(ordersQuery.error as Error).message} onRetry={ordersQuery.refetch} />
            ) : o ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4">
                  <KpiCard title="Created (cohort)" value={String(o.kpis.orders_created_count)} hint="created_at in range" />
                  <KpiCard
                    title="Active (workshop)"
                    value={String(o.kpis.active_workshop_orders_count)}
                    hint="snapshot — not date-scoped"
                  />
                  <KpiCard title="Completed" value={String(o.kpis.completed_orders_count)} />
                  <KpiCard title="Cancelled" value={String(o.kpis.cancelled_orders_count)} />
                  <KpiCard title="Cohort total (pence)" value={formatGBP(o.kpis.total_pence_created_cohort)} />
                  <KpiCard title="Avg order value" value={formatGBP(o.kpis.average_order_value_pence)} />
                  <KpiCard
                    title="Avg completion time"
                    value={formatOptionalHours(o.kpis.average_completion_hours)}
                    hint="completed orders in range"
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="overflow-hidden">
                    <CardHeader>
                      <CardTitle className="text-base">Orders created per day</CardTitle>
                      <CardDescription className="text-xs">Cohort by created_at.</CardDescription>
                    </CardHeader>
                    <Separator />
                    <CardContent className="h-[280px] w-full pt-4 pb-2 sm:h-[300px]">
                      {!hasOrdersSeries ? (
                        <p className="text-sm text-muted-foreground">No orders created in this window.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={o.series.orders_by_day} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                            <RechartsTooltip />
                            <Legend />
                            <Bar dataKey="count" name="Orders" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Recent order activity</CardTitle>
                      <CardDescription className="text-xs">Newest in cohort.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {o.recent_activity.rows.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No rows for this filter.</p>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border">
                          <table className="w-full min-w-[320px] text-left text-sm">
                            <thead className="border-b bg-muted/40">
                              <tr>
                                <th className="px-3 py-2 font-medium">Order</th>
                                <th className="px-3 py-2 font-medium">Status</th>
                                <th className="px-3 py-2 font-medium text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {o.recent_activity.rows.map((row) => (
                                <tr key={String(row.id)} className="border-b last:border-0">
                                  <td className="px-3 py-2">
                                    <Link href={`/admin/orders/${String(row.id)}`} className="text-primary underline">
                                      {String(row.id).slice(0, 8)}…
                                    </Link>
                                  </td>
                                  <td className="px-3 py-2">
                                    <StatusBadge kind="order" status={String(row.order_status ?? "")} />
                                  </td>
                                  <td className="px-3 py-2 text-right tabular-nums font-medium">
                                    {formatGBP(Number(row.total_pence ?? 0))}
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

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Order status breakdown</CardTitle>
                    <CardDescription className="text-xs">Shares of orders created in range.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!hasOrderStatus ? (
                      <p className="text-sm text-muted-foreground">No orders in this cohort.</p>
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
                            {o.series.order_status_breakdown.map((row) => (
                              <tr key={row.status} className="border-b last:border-0">
                                <td className="px-3 py-2">
                                  <StatusBadge kind="order" status={row.status} />
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

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Order detail (paginated)</CardTitle>
                    <CardDescription className="text-xs">Cohort list, newest first.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!o.table || o.table.rows.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No orders in this cohort.</p>
                    ) : (
                      <>
                        <div className="overflow-x-auto rounded-lg border">
                          <table className="w-full min-w-[400px] text-left text-sm">
                            <thead className="border-b bg-muted/40">
                              <tr>
                                <th className="px-3 py-2 font-medium">ID</th>
                                <th className="px-3 py-2 font-medium">Status</th>
                                <th className="px-3 py-2 font-medium text-right">Total</th>
                                <th className="px-3 py-2 font-medium">Company</th>
                              </tr>
                            </thead>
                            <tbody>
                              {o.table.rows.map((row) => (
                                <tr key={String(row.id)} className="border-b last:border-0">
                                  <td className="px-3 py-2">
                                    <Link href={`/admin/orders/${String(row.id)}`} className="text-primary underline">
                                      {String(row.id).slice(0, 8)}…
                                    </Link>
                                  </td>
                                  <td className="px-3 py-2">
                                    <StatusBadge kind="order" status={String(row.order_status ?? "")} />
                                  </td>
                                  <td className="px-3 py-2 text-right tabular-nums font-medium">
                                    {formatGBP(Number(row.total_pence ?? 0))}
                                  </td>
                                  <td className="px-3 py-2">{String(row.company_name ?? "—")}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <TablePagination
                          meta={o.table.meta as { current_page?: number; last_page?: number; total?: number }}
                          onPage={(p) => setFilter({ orders_page: String(p) })}
                        />
                      </>
                    )}
                  </CardContent>
                </Card>

                <details className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
                  <summary className="cursor-pointer font-medium text-foreground">Order metric definitions</summary>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
                    {Object.entries(o.definitions).map(([k, v]) => (
                      <li key={k}>
                        <span className="font-mono text-xs">{k}</span>: {v}
                      </li>
                    ))}
                  </ul>
                </details>
              </>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
