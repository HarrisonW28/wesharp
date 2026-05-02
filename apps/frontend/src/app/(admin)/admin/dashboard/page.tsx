"use client";

import Link from "next/link";
import { useMemo } from "react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Banknote,
  CalendarDays,
  CircleDollarSign,
  Landmark,
  Receipt,
  RefreshCw,
  UtensilsCrossed,
} from "lucide-react";
import { useQueries } from "@tanstack/react-query";

import {
  AnalyticsOverviewResponseSchema,
  AnalyticsSalesResponseSchema,
} from "@/lib/api/admin-analytics-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { formatGBP } from "@/lib/format/money";

import { AdminQuickActionsCard } from "@/components/admin/AdminQuickActionsCard";
import { ChartCard } from "@/components/cards/ChartCard";
import { StatCard } from "@/components/cards/StatCard";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function defaultDateRangeQs(): string {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 89);
  const p = new URLSearchParams();
  p.set("date_to", to.toISOString().slice(0, 10));
  p.set("date_from", from.toISOString().slice(0, 10));
  return `?${p.toString()}`;
}

export default function AdminDashboardPage() {
  const admin = useAdminApi();
  const qs = defaultDateRangeQs();

  const [overviewQuery, salesQuery] = useQueries({
    queries: [
      {
        queryKey: ["admin-dash-overview", qs],
        queryFn: async () => {
          const res = await admin.json<unknown>(`/api/admin/analytics/overview${qs}`);
          if (!res.ok) {
            throw Object.assign(new Error(res.message), { status: res.status });
          }
          const parsed = AnalyticsOverviewResponseSchema.safeParse(res.data);
          if (!parsed.success) {
            throw new Error("Overview response did not match schema.");
          }
          return parsed.data.data;
        },
        retry: 1,
      },
      {
        queryKey: ["admin-dash-sales", qs],
        queryFn: async () => {
          const res = await admin.json<unknown>(`/api/admin/analytics/sales${qs}`);
          if (!res.ok) {
            throw Object.assign(new Error(res.message), { status: res.status });
          }
          const parsed = AnalyticsSalesResponseSchema.safeParse(res.data);
          if (!parsed.success) {
            throw new Error("Sales analytics response did not match schema.");
          }
          return parsed.data.data;
        },
        retry: 1,
      },
    ],
  });

  const chartData = useMemo(() => {
    const daily = salesQuery.data?.revenue_daily ?? [];
    return daily.slice(-7).map((d) => ({
      label: d.date.slice(5),
      revenueMinor: d.revenue_pence,
    }));
  }, [salesQuery.data]);

  const chartIsEmpty =
    chartData.length === 0 || chartData.every((row) => typeof row.revenueMinor === "number" && row.revenueMinor === 0);

  const pending = overviewQuery.isPending || salesQuery.isPending;
  const fault = overviewQuery.isError || salesQuery.isError;
  const kpis = overviewQuery.data?.kpis;

  if (pending) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <Skeleton className="h-9 w-40 shrink-0" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full max-w-4xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Dashboard" }]} />
      <PageHeader
        title="Operations dashboard"
        description="Headline volumes and cash position for roughly the last 90 days — figures come from your live Laravel totals."
        actions={
          <Button type="button" variant="outline" size="sm" asChild className="shrink-0">
            <Link href="/admin/analytics">Deep-dive analytics</Link>
          </Button>
        }
      />

      <AdminQuickActionsCard />

      {fault ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load dashboard</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>{(overviewQuery.error as Error)?.message ?? (salesQuery.error as Error)?.message ?? "Request failed."}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-destructive-foreground/40"
              onClick={() => {
                void overviewQuery.refetch();
                void salesQuery.refetch();
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {!fault && kpis ? (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="New bookings · this week"
            value={String(kpis.new_bookings_this_week)}
            hint={`${overviewQuery.data?.distinct_cities?.length ?? 0} cities in this window`}
            icon={CalendarDays}
          />
          <StatCard
            title="Knives sharpened · this week"
            value={String(kpis.knives_sharpened_this_week)}
            trend={`Active customers · ${kpis.active_customers}`}
            trendPositive
            icon={UtensilsCrossed}
          />
          <StatCard
            title="Revenue · this week"
            value={formatGBP(kpis.revenue_this_week_pence)}
            trend={`This month · ${formatGBP(kpis.revenue_this_month_pence)}`}
            trendPositive={kpis.revenue_this_month_pence >= kpis.revenue_this_week_pence}
            icon={CircleDollarSign}
          />
        </div>
      ) : null}

      {!fault && kpis ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <StatCard title="Outstanding invoices" value={String(kpis.outstanding_invoice_count)} hint="Issued invoices with balance" icon={Receipt} />
          <StatCard title="Outstanding balance" value={formatGBP(kpis.outstanding_invoice_amount_pence)} hint="Totals minus receipts" icon={Landmark} />
          <StatCard title="Avg price / blade" value={formatGBP(kpis.average_price_per_knife_pence)} hint="Completed orders · filter window" icon={Banknote} />
        </div>
      ) : null}

      {!fault ? (
      <ChartCard
        title="Revenue pulse · trailing week"
        description="Daily GBP for the last seven days in range."
      >
        {!chartIsEmpty ? (
          <div className="w-full min-w-0">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillRevDash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.62 0.2 252)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="oklch(0.62 0.2 252)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 6" className="stroke-border/70" />
                <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(v: number) => formatGBP(Number(v))}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => formatGBP(Number(value ?? 0))}
                  labelFormatter={(label) => `Bucket · ${label}`}
                  contentStyle={{ borderRadius: 12 }}
                />
                <Area type="monotone" dataKey="revenueMinor" stroke="oklch(0.62 0.2 252)" strokeWidth={2} fill="url(#fillRevDash)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-16 text-center text-sm text-muted-foreground">No revenue buckets in range yet.</p>
        )}
      </ChartCard>
      ) : null}
    </div>
  );
}
