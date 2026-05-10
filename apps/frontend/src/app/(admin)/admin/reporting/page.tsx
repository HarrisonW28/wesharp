"use client";

import Link from "next/link";
import { useMemo } from "react";

import {
  Activity,
  Banknote,
  BarChart3,
  CircleDollarSign,
  Coins,
  Gauge,
  Landmark,
  LineChart,
  Receipt,
  Repeat,
  Utensils,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useBackendMe } from "@/hooks/use-backend-me";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PortalPage } from "@/components/layout/PortalPage";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type HubCard = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

function HubSection({ title, cards }: { title: string; cards: HubCard[] }) {
  if (cards.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.href} href={c.href} className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <Card className="h-full border-border/80 shadow-sm transition-colors group-hover:border-primary/35 group-hover:bg-accent/20">
                <CardHeader className="space-y-2 pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    {c.title}
                  </CardTitle>
                  <CardDescription className="text-sm leading-snug">{c.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function AdminReportingHubPage() {
  const { data } = useBackendMe();
  const permissions = useMemo(() => new Set(data?.data?.permissions ?? []), [data?.data?.permissions]);

  const { analytics, finance, operations } = useMemo(() => {
    const analyticsCards: HubCard[] = [];
    const financeCards: HubCard[] = [];
    const operationsCards: HubCard[] = [];

    if (permissions.has("analytics.view")) {
      analyticsCards.push({
        href: "/admin/analytics",
        title: "Analytics",
        description: "Trend charts, cohort views, and KPI snapshots.",
        icon: Activity,
      });
    }
    if (permissions.has("payments.view")) {
      financeCards.push({
        href: "/admin/finance",
        title: "Finance overview",
        description: "Dashboard filters and invoice-age context.",
        icon: Landmark,
      });
      financeCards.push({
        href: "/admin/payments",
        title: "Payments",
        description: "Ledger entries and payment reconciliation.",
        icon: Banknote,
      });
    }
    if (permissions.has("costs.view")) {
      financeCards.push({
        href: "/admin/finance/cost-ledger",
        title: "Cost ledger",
        description: "Sprint 23.5 allocations and seeded/import cost attribution trails.",
        icon: Coins,
      });
    }
    if (permissions.has("invoices.view")) {
      financeCards.push({
        href: "/admin/invoices",
        title: "Invoices",
        description: "List, status, and customer billing detail.",
        icon: Receipt,
      });
    }
    if (permissions.has("reports.finance")) {
      financeCards.push(
        {
          href: "/admin/reports/sales",
          title: "Sales report",
          description: "Revenue and sales trends.",
          icon: LineChart,
        },
        {
          href: "/admin/reports/billing",
          title: "Billing report",
          description: "Invoicing and cash collection.",
          icon: CircleDollarSign,
        },
        {
          href: "/admin/reports/recurring-revenue",
          title: "Recurring revenue",
          description: "MRR and subscription momentum.",
          icon: Repeat,
        },
      );
    }
    if (permissions.has("reports.operations")) {
      operationsCards.push(
        {
          href: "/admin/reports/operations",
          title: "Operations report",
          description: "Bookings and orders in one operational view.",
          icon: BarChart3,
        },
        {
          href: "/admin/reports/routes",
          title: "Routes report",
          description: "Stops, timing, and route performance.",
          icon: Gauge,
        },
        {
          href: "/admin/reports/knives",
          title: "Knives & services",
          description: "Blade throughput and service mix.",
          icon: Utensils,
        },
      );
    }

    return { analytics: analyticsCards, finance: financeCards, operations: operationsCards };
  }, [permissions]);

  const hasAnything = analytics.length + finance.length + operations.length > 0;

  return (
    <PortalPage>
      <Breadcrumbs homeHref="/admin/dashboard" items={[{ label: "Reporting hub" }]} />
      <PageHeader
        title="Reporting hub"
        description="Jump to analytics, finance tools, and CSV-backed reports. Sections appear based on your permissions."
      />

      {!hasAnything ? (
        <p className="text-sm text-muted-foreground">
          You do not have access to analytics or reports yet. Ask an administrator if you need visibility here.
        </p>
      ) : (
        <div className="max-w-6xl space-y-10">
          <HubSection title="Analytics & snapshots" cards={analytics} />
          <HubSection title="Finance" cards={finance} />
          <HubSection title="Operations" cards={operations} />
        </div>
      )}
    </PortalPage>
  );
}
