"use client";

import { Boxes, CircleGauge, Receipt } from "lucide-react";

import { MOCK_BOOKINGS } from "@/lib/mock-data/bookings";
import { MOCK_ORDERS } from "@/lib/mock-data/orders";

import { StatCard } from "@/components/cards/StatCard";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { formatCurrencyMinor } from "@/lib/formatters/format-currency";

export default function AccountDashboardPage() {
  const upcoming = MOCK_BOOKINGS.filter((b) => b.status !== "completed").length;
  const openOrdersMinor = MOCK_ORDERS.reduce((sum, o) => sum + o.totalMinor, 0);

  return (
    <div className="space-y-8">
      <Breadcrumbs homeHref="/account/dashboard" items={[{ label: "Dashboard" }]} />
      <PageHeader
        title="Venue overview"
        description="Self-service cockpit — mocked aggregates until Clerk sessions bind tenant scopes server-side."
        actions={
          <Button type="button" variant="secondary" asChild>
            <a href="mailto:support@wesharp.invalid">Talk to ops</a>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Active bookings" value={String(upcoming)} hint="Requested + confirmed windows" icon={CircleGauge} />
        <StatCard title="Completed (demo list)" value={String(MOCK_BOOKINGS.filter((b) => b.status === "completed").length)} icon={Boxes} />
        <StatCard title="Orders outstanding · demo totals" value={formatCurrencyMinor(openOrdersMinor)} trend="Stripe reconciliation lands next sprint" icon={Receipt} />
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="text-sm font-semibold">Next pickup window</div>
        <p className="mt-2 text-sm text-muted-foreground">
          Notifications channel placeholders — TanStack Query hooks will hydrate once Laravel publishes `/api/v1/account/timeline`.
        </p>
      </div>
    </div>
  );
}
