"use client";

import { CalendarDays, Gauge, Percent } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { MOCK_ANALYTICS_SERIES, MOCK_KPIS } from "@/lib/mock-data/analytics";

import { ChartCard } from "@/components/cards/ChartCard";
import { StatCard } from "@/components/cards/StatCard";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatCurrencyMinor } from "@/lib/formatters/format-currency";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Dashboard" }]} />
      <PageHeader
        title="Operations dashboard"
        description="Throughput and revenue snapshots — powered by mock analytics until APIs wire through TanStack Query."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Bookings · rolling week"
          value={String(MOCK_KPIS.bookingsThisWeek)}
          trend="+9.4% vs last week · demo"
          icon={CalendarDays}
        />
        <StatCard
          title="Route completion"
          value={`${(MOCK_KPIS.completionRate * 100).toFixed(1)}%`}
          hint="Technician confirmations vs planned stops"
          icon={Percent}
        />
        <StatCard
          title="Avg knives / stop"
          value={String(MOCK_KPIS.avgKnivesPerStop)}
          trend="Healthy cadence · demo"
          trendPositive
          icon={Gauge}
        />
      </div>

      <ChartCard title="Revenue pulse · demo series" description="Seven-day illustrative totals — VAT-inclusive formatting preview.">
        <div className="w-full min-w-0">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={MOCK_ANALYTICS_SERIES} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="fillRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.62 0.2 252)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="oklch(0.62 0.2 252)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 6" className="stroke-border/70" />
              <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v: number) => `£${Math.round(v / 100)}`}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => formatCurrencyMinor(Number(value ?? 0))}
                labelFormatter={(label) => `Day · ${label}`}
                contentStyle={{ borderRadius: 12 }}
              />
              <Area type="monotone" dataKey="revenueMinor" stroke="oklch(0.62 0.2 252)" strokeWidth={2} fill="url(#fillRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}
