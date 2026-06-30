"use client";

import Link from "next/link";
import { useMemo } from "react";

import {
  Calculator,
  CircleDollarSign,
  LayoutGrid,
  LineChart,
  Percent,
  PiggyBank,
  Repeat,
  ShoppingCart,
  Truck,
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
            <Link
              key={c.href}
              href={c.href}
              className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
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

export default function AdminFinanceReportsHubPage() {
  const { data } = useBackendMe();
  const permissions = useMemo(() => new Set(data?.data?.permissions ?? []), [data?.data?.permissions]);

  const { summary, cashPlanning, revenue, billing, routeEconomics } = useMemo(() => {
    const summaryCards: HubCard[] = [];
    const cashPlanningCards: HubCard[] = [];
    const revenueCards: HubCard[] = [];
    const billingCards: HubCard[] = [];
    const routeCards: HubCard[] = [];

    if (permissions.has("reports.executive_dashboard") || permissions.has("reports.finance")) {
      summaryCards.push({
        href: "/admin/reports/executive-dashboard",
        title: "Executive dashboard",
        description: "Profit, cash, runway and subscription pulse in one view — with links into detailed reports.",
        icon: LayoutGrid,
      });
    }

    if (permissions.has("reports.finance") || permissions.has("costs.view")) {
      cashPlanningCards.push(
        {
          href: "/admin/reports/forecast-scenarios",
          title: "Forecast scenarios",
          description: "Model routes, volume and pricing against fixed costs to see estimated profit and payback.",
          icon: Percent,
        },
        {
          href: "/admin/reports/cash-position",
          title: "Cash position",
          description: "Starting capital, money already spent, upcoming purchases and runway based on recurring burn.",
          icon: PiggyBank,
        },
      );
    }

    if (permissions.has("reports.finance") || permissions.has("costs.view")) {
      revenueCards.push({
        href: "/admin/reports/subscription-profitability",
        title: "Subscription profitability",
        description: "Subscription and overage revenue, usage and internal cost signals per customer.",
        icon: Calculator,
      });
    }

    if (permissions.has("reports.sales_performance") || permissions.has("reports.finance")) {
      revenueCards.push({
        href: "/admin/reports/sales-performance",
        title: "Sales & checkout performance",
        description: "Online checkout outcomes, in-person style payments and how revenue ties back to customers.",
        icon: ShoppingCart,
      });
    }

    if (permissions.has("reports.finance")) {
      revenueCards.push(
        {
          href: "/admin/reports/sales",
          title: "Sales report",
          description: "Revenue trends and breakdowns over time.",
          icon: LineChart,
        },
        {
          href: "/admin/reports/recurring-revenue",
          title: "Recurring revenue",
          description: "Subscription momentum and recurring income.",
          icon: Repeat,
        },
      );
      billingCards.push({
        href: "/admin/reports/billing",
        title: "Billing report",
        description: "Who owes what, ageing buckets and payment behaviour.",
        icon: CircleDollarSign,
      });
    }

    if (permissions.has("reports.operations") || permissions.has("reports.finance") || permissions.has("costs.view")) {
      routeCards.push({
        href: "/admin/reports/route-profitability",
        title: "Route profitability",
        description: "Revenue and estimated costs per route — fuel, consumables and allocations where recorded.",
        icon: Truck,
      });
    }

    return {
      summary: summaryCards,
      cashPlanning: cashPlanningCards,
      revenue: revenueCards,
      billing: billingCards,
      routeEconomics: routeCards,
    };
  }, [permissions]);

  const hasAnything =
    summary.length + cashPlanning.length + revenue.length + billing.length + routeEconomics.length > 0;

  return (
    <PortalPage>
      <Breadcrumbs
        homeHref="/admin/dashboard"
        items={[{ label: "Reports", href: "/admin/reporting" }, { label: "Finance reports" }]}
      />
      <PageHeader
        title="Finance reports"
        description="Pick a report below. What you see depends on your role — ask an admin if something is missing."
      />

      {!hasAnything ? (
        <p className="text-sm text-muted-foreground">
          You do not have access to finance reports. Ask an administrator if you need visibility here.
        </p>
      ) : (
        <div className="max-w-6xl space-y-10">
          <HubSection title="Summary" cards={summary} />
          <HubSection title="Cash & planning" cards={cashPlanning} />
          <HubSection title="Revenue & subscriptions" cards={revenue} />
          <HubSection title="Billing & collections" cards={billing} />
          <HubSection title="Route economics" cards={routeEconomics} />
        </div>
      )}
    </PortalPage>
  );
}
