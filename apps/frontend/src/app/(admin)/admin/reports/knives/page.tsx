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

import { KnifeServiceReportResponseSchema } from "@/lib/api/admin-knife-service-report-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Badge } from "@/components/ui/badge";
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

const KNIFE_STATUSES = [
  "logged",
  "received",
  "inspected",
  "sharpening",
  "sharpened",
  "quality_checked",
  "returned",
  "cancelled",
  "issue_reported",
] as const;

const SERVICE_TYPES = ["collection", "onsite"] as const;

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
        {total > 0 ? ` · ${total} knives` : ""}
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

export default function AdminKnifeServiceReportPage() {
  const admin = useAdminApi();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const dateFrom = searchParams.get("date_from") ?? "";
  const dateTo = searchParams.get("date_to") ?? "";
  const companyId = searchParams.get("company_id") ?? "";
  const knifeType = searchParams.get("knife_type") ?? "";
  const serviceType = searchParams.get("service_type") ?? "";
  const knifeStatus = searchParams.get("knife_status") ?? "";
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
        company_id: companyId,
        knife_type: knifeType,
        service_type: serviceType,
        knife_status: knifeStatus,
        page,
      }),
    [companyId, dateFrom, dateTo, knifeStatus, knifeType, page, serviceType],
  );

  const reportQuery = useQuery({
    queryKey: ["admin-knife-service-report", reportQs],
    queryFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/reports/knives${reportQs}`);
      if (!res.ok) throw new Error(res.message);
      const parsed = KnifeServiceReportResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected knives report payload.");
      return parsed.data.data;
    },
  });

  const companiesQuery = useQuery({
    queryKey: ["admin-lookups-companies-knife-report"],
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
  const hasDaySeries = (d?.series.knives_by_day.length ?? 0) > 0;
  const hasTopCo = (d?.series.top_companies_by_knife_volume.length ?? 0) > 0;
  const hasStatusBreakdown = (d?.series.knife_status_breakdown ?? []).some((r) => r.count > 0);

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Knife & service volume", href: "/admin/reports/knives" },
        ]}
      />
      <PageHeader
        title="Knife & service volume"
        description="Workshop throughput from knife rows: activity is scoped by updated_at; pipeline and assignment metrics are defined in the API."
      />

      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription className="text-base">
            Date range filters knife <span className="font-medium">updated_at</span>. Service type comes from the linked{" "}
            <span className="font-medium">booking</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="space-y-2">
            <Label htmlFor="kr-from" className="text-base">
              From
            </Label>
            <Input
              id="kr-from"
              type="date"
              className="h-11 text-base"
              value={dateFrom}
              onChange={(e) => setFilter({ date_from: e.target.value, page: "1" })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kr-to" className="text-base">
              To
            </Label>
            <Input
              id="kr-to"
              type="date"
              className="h-11 text-base"
              value={dateTo}
              onChange={(e) => setFilter({ date_to: e.target.value, page: "1" })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-base">Company</Label>
            <Select
              value={companyId || "__all__"}
              onValueChange={(v) => setFilter({ company_id: v === "__all__" ? "" : v, page: "1" })}
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
            <Label htmlFor="kr-type" className="text-base">
              Knife type (exact)
            </Label>
            <Input
              id="kr-type"
              className="h-11 text-base"
              placeholder="e.g. chef"
              value={knifeType}
              onChange={(e) => setFilter({ knife_type: e.target.value, page: "1" })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-base">Service type</Label>
            <Select
              value={serviceType || "__all__"}
              onValueChange={(v) => setFilter({ service_type: v === "__all__" ? "" : v, page: "1" })}
            >
              <SelectTrigger className="h-11 text-base">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-base">
                  All
                </SelectItem>
                {SERVICE_TYPES.map((s) => (
                  <SelectItem key={s} value={s} className="text-base">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-base">Knife status</Label>
            <Select
              value={knifeStatus || "__all__"}
              onValueChange={(v) => setFilter({ knife_status: v === "__all__" ? "" : v, page: "1" })}
            >
              <SelectTrigger className="h-11 text-base">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-base">
                  All
                </SelectItem>
                {KNIFE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-base">
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  company_id: "",
                  knife_type: "",
                  service_type: "",
                  knife_status: "",
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
          <p className="text-base">Loading knife report…</p>
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
            <KpiCard title="Activity (cohort)" value={String(d.kpis.knives_activity_count)} hint="updated_at in range" />
            <KpiCard title="Completed workshop" value={String(d.kpis.knives_completed_workshop_count)} hint="output states" />
            <KpiCard
              title="In progress (snapshot)"
              value={String(d.kpis.knives_in_progress_snapshot_count)}
              hint="not date-scoped"
            />
            <KpiCard title="Inspected (cohort)" value={String(d.kpis.knives_inspected_count)} />
            <KpiCard title="Sharpened throughput" value={String(d.kpis.sharpened_throughput_count)} hint="sharpened / QC / returned" />
            <KpiCard
              title="Avg knives / order"
              value={d.kpis.average_knives_per_order !== null ? String(d.kpis.average_knives_per_order) : "—"}
            />
            <KpiCard title="Reservice links" value={String(d.kpis.reservice_assignments_count)} hint="assignments in range" />
            <KpiCard title="Damage reports" value={String(d.kpis.damage_reports_created_count)} hint="created in range" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base">Volume over time</CardTitle>
                <CardDescription className="text-xs">Knife rows by updated date (UTC bucket).</CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="h-[280px] w-full pt-4 pb-2 sm:h-[300px]">
                {!hasDaySeries ? (
                  <p className="text-sm text-muted-foreground">No knife activity in this window.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={d.series.knives_by_day} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="count" name="Knives" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top customers by volume</CardTitle>
                <CardDescription className="text-xs">Knife rows in cohort (max 50).</CardDescription>
              </CardHeader>
              <CardContent>
                {!hasTopCo ? (
                  <p className="text-sm text-muted-foreground">No companies in this cohort.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[360px] text-left text-sm">
                      <thead className="border-b bg-muted/40">
                        <tr>
                          <th className="px-3 py-2 font-medium">Customer</th>
                          <th className="px-3 py-2 font-medium text-right">Knives</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.series.top_companies_by_knife_volume.map((row) => (
                          <tr key={row.company_id} className="border-b last:border-0">
                            <td className="px-3 py-2">
                              <Link href={`/admin/crm/${row.company_id}`} className="font-medium text-primary underline">
                                {row.company_name}
                              </Link>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums font-medium">{row.knife_count}</td>
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
                <CardTitle className="text-base">By knife type</CardTitle>
              </CardHeader>
              <CardContent>
                {d.series.knife_type_breakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No rows.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[280px] text-left text-sm">
                      <thead className="border-b bg-muted/40">
                        <tr>
                          <th className="px-3 py-2 font-medium">Type</th>
                          <th className="px-3 py-2 font-medium text-right">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.series.knife_type_breakdown.map((row) => (
                          <tr key={row.knife_type} className="border-b last:border-0">
                            <td className="px-3 py-2">{row.knife_type}</td>
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
                <CardTitle className="text-base">By booking service type</CardTitle>
                <CardDescription className="text-xs">none = no linked booking.</CardDescription>
              </CardHeader>
              <CardContent>
                {d.series.service_type_breakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No rows.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[280px] text-left text-sm">
                      <thead className="border-b bg-muted/40">
                        <tr>
                          <th className="px-3 py-2 font-medium">Service</th>
                          <th className="px-3 py-2 font-medium text-right">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.series.service_type_breakdown.map((row) => (
                          <tr key={row.service_type} className="border-b last:border-0">
                            <td className="px-3 py-2">{row.service_type}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{row.count}</td>
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
                <CardTitle className="text-base">By knife status</CardTitle>
              </CardHeader>
              <CardContent>
                {!hasStatusBreakdown ? (
                  <p className="text-sm text-muted-foreground">No rows in cohort.</p>
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
                        {d.series.knife_status_breakdown.map((row) => (
                          <tr key={row.status} className="border-b last:border-0">
                            <td className="px-3 py-2">
                              <StatusBadge kind="knife" status={row.status} />
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
                <CardTitle className="text-base">Service link kinds</CardTitle>
                <CardDescription className="text-xs">Assignments with linked_at in range.</CardDescription>
              </CardHeader>
              <CardContent>
                {d.series.service_kind_breakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No assignments in this window.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[280px] text-left text-sm">
                      <thead className="border-b bg-muted/40">
                        <tr>
                          <th className="px-3 py-2 font-medium">Kind</th>
                          <th className="px-3 py-2 font-medium text-right">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.series.service_kind_breakdown.map((row) => (
                          <tr key={row.service_kind} className="border-b last:border-0">
                            <td className="px-3 py-2 font-mono text-xs">{row.service_kind}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{row.count}</td>
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
                <CardTitle className="text-base">Damage by severity</CardTitle>
              </CardHeader>
              <CardContent>
                {d.series.damage_by_severity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No damage reports in this window.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {d.series.damage_by_severity.map((row) => (
                      <Badge key={row.severity} variant="secondary" className="tabular-nums">
                        {row.severity}: {row.count}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Damage by status</CardTitle>
              </CardHeader>
              <CardContent>
                {d.series.damage_by_status.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No damage reports in this window.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[240px] text-left text-sm">
                      <thead className="border-b bg-muted/40">
                        <tr>
                          <th className="px-3 py-2 font-medium">Status</th>
                          <th className="px-3 py-2 font-medium text-right">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.series.damage_by_status.map((row) => (
                          <tr key={row.status} className="border-b last:border-0">
                            <td className="px-3 py-2">{row.status}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{row.count}</td>
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
              <CardTitle className="text-base">Knife detail</CardTitle>
              <CardDescription className="text-xs">Paginated cohort, newest activity first.</CardDescription>
            </CardHeader>
            <CardContent>
              {!d.table || d.table.rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No knives in this window.</p>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead className="border-b bg-muted/40">
                        <tr>
                          <th className="px-3 py-2 font-medium">Knife</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                          <th className="px-3 py-2 font-medium">Type</th>
                          <th className="px-3 py-2 font-medium">Company</th>
                          <th className="px-3 py-2 font-medium">Service</th>
                          <th className="px-3 py-2 font-medium">Order</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.table.rows.map((row) => (
                          <tr key={String(row.id)} className="border-b last:border-0">
                            <td className="px-3 py-2">
                              <Link href={`/admin/knives/${String(row.id)}`} className="text-primary underline">
                                {String(row.label ?? row.id).slice(0, 40)}
                              </Link>
                            </td>
                            <td className="px-3 py-2">
                              <StatusBadge kind="knife" status={String(row.knife_status ?? "")} />
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">{String(row.knife_type ?? "—")}</td>
                            <td className="px-3 py-2">{String(row.company_name ?? "—")}</td>
                            <td className="px-3 py-2 font-mono text-xs">{String(row.service_type ?? "—")}</td>
                            <td className="px-3 py-2">
                              {row.order_id ? (
                                <Link href={`/admin/orders/${String(row.order_id)}`} className="text-primary underline">
                                  Order
                                </Link>
                              ) : (
                                "—"
                              )}
                            </td>
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
