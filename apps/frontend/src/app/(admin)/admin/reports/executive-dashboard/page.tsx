"use client";

import Link from "next/link";
import { useEffect } from "react";

import { AlertTriangle, ArrowUpRight, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { ExecutiveFinanceDashboardResponseSchema } from "@/lib/api/admin-executive-finance-dashboard-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";

import { NavBreadcrumbs } from "@/components/layout/NavBreadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function KpiLinkCard(props: {
  title: string;
  value: string;
  hint?: string;
  href?: string;
  linkLabel?: string;
}) {
  const inner = (
    <>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium text-muted-foreground">{props.title}</CardTitle>
        {props.hint ? <CardDescription className="text-xs">{props.hint}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-xl font-semibold tabular-nums tracking-tight sm:text-2xl">{props.value}</p>
        {props.href ? (
          <Link
            href={props.href}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            {props.linkLabel ?? "Open report"}
            <ArrowUpRight className="h-3 w-3" aria-hidden />
          </Link>
        ) : null}
      </CardContent>
    </>
  );

  return <Card className="min-h-[120px] shadow-sm">{inner}</Card>;
}

function str(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "—";
}

export default function ExecutiveFinanceDashboardPage() {
  const admin = useAdminApi();

  const query = useQuery({
    queryKey: ["admin", "reports", "executive-dashboard"],
    queryFn: async () => {
      const res = await admin.json<unknown>("/api/admin/reports/executive-dashboard");
      if (!res.ok) throw new Error(res.message);
      const parsed = ExecutiveFinanceDashboardResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected executive dashboard payload shape.");
      return parsed.data.data;
    },
  });

  useEffect(() => {
    if (query.isError) toast.error((query.error as Error).message);
  }, [query.error, query.isError]);

  const d = query.data;
  const kpis = d?.kpis ?? {};
  const sections = d?.sections ?? {};
  const periods = d?.periods ?? {};
  const alerts = Array.isArray(d?.alerts) ? d.alerts : [];
  const forecastLinks = Array.isArray(d?.forecast_links) ? d.forecast_links : [];

  const severityVariant = (s: string): "default" | "destructive" | "secondary" | "outline" => {
    if (s === "danger") return "destructive";
    if (s === "warning") return "secondary";
    return "outline";
  };

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-16">
      <NavBreadcrumbs suffix={[{ label: "Executive dashboard" }]} />
      <PageHeader
        title="Executive finance dashboard"
        description="Sprint 24.6 — profit, cash, runway, MRR, routes, subscription signals and actionable alerts in one owner snapshot."
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
            {query.isFetching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
            <span className="ml-2">Refresh</span>
          </Button>
        }
      />

      {query.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading executive snapshot…
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Alerts</h2>
        {alerts.length === 0 ? (
          <Card className="border-dashed shadow-sm">
            <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
              <Sparkles className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              No priority alerts for the current signals — spot-check linked reports periodically.
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {alerts.map((a) => (
              <li key={a.code}>
                <Card className="h-full border-border/80 shadow-sm">
                  <CardHeader className="flex flex-row items-start gap-2 space-y-0 pb-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" aria-hidden />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={severityVariant(a.severity)}>{a.severity}</Badge>
                        <span className="font-mono text-xs text-muted-foreground">{a.code}</span>
                      </div>
                      <CardTitle className="text-base leading-snug">{a.message}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {a.href ? (
                      <Link href={a.href} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                        {a.cta ?? "Open"}
                      </Link>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Activity windows</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {(["today", "this_week", "this_month"] as const).map((key) => {
            const label = key === "today" ? "Today" : key === "this_week" ? "This week" : "This month";
            const row = sections[key] as { bookings_created?: number; orders_created?: number; invoices_issued?: number } | undefined;
            const p = periods[key] as { date_from?: string; date_to?: string } | undefined;
            return (
              <Card key={key} className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{label}</CardTitle>
                  {p?.date_from && p?.date_to ? (
                    <CardDescription>
                      {p.date_from} → {p.date_to}
                    </CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent className="grid gap-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Bookings created</span>
                    <span className="tabular-nums font-medium">{row?.bookings_created ?? "—"}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Orders created</span>
                    <span className="tabular-nums font-medium">{row?.orders_created ?? "—"}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Invoices issued</span>
                    <span className="tabular-nums font-medium">{row?.invoices_issued ?? "—"}</span>
                  </div>
                  <Link href="/admin/reports/operations" className="pt-1 text-xs font-medium text-primary underline-offset-4 hover:underline">
                    Operations report
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Core KPIs (this month)</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <KpiLinkCard
            title="Revenue (payments in period)"
            value={str(kpis.formatted_revenue_this_month)}
            href={typeof kpis.revenue_this_month_href === "string" ? kpis.revenue_this_month_href : "/admin/reports/billing"}
          />
          <KpiLinkCard
            title="Gross profit estimate"
            value={str(kpis.formatted_gross_profit_estimate_month)}
            hint="Route margin + subscription margin estimate."
            href={typeof kpis.gross_profit_href === "string" ? kpis.gross_profit_href : "/admin/reports/subscription-profitability"}
          />
          <KpiLinkCard
            title="Net profit (rough)"
            value={str(kpis.formatted_net_profit_estimate_month)}
            hint={typeof kpis.net_profit_note === "string" ? kpis.net_profit_note : undefined}
            href="/admin/reports/cash-position"
            linkLabel="Cash & burn context"
          />
          <KpiLinkCard
            title="Cash buffer"
            value={str(kpis.formatted_cash_buffer)}
            href={typeof kpis.cash_href === "string" ? kpis.cash_href : "/admin/reports/cash-position"}
          />
          <KpiLinkCard
            title="Runway"
            value={[kpis.formatted_runway_weeks, kpis.formatted_runway_months].filter(Boolean).join(" · ") || "—"}
            href="/admin/reports/cash-position"
          />
          <KpiLinkCard
            title="Monthly recurring burn"
            value={str(kpis.formatted_recurring_costs_monthly)}
            href={typeof kpis.recurring_costs_href === "string" ? kpis.recurring_costs_href : "/admin/finance/cost-ledger"}
          />
          <KpiLinkCard title="MRR snapshot" value={str(kpis.formatted_mrr)} href={typeof kpis.mrr_href === "string" ? kpis.mrr_href : "/admin/reports/recurring-revenue"} />
          <KpiLinkCard
            title="Overdue invoices"
            value={String(kpis.overdue_invoices_count ?? "—")}
            hint={typeof kpis.formatted_outstanding_debt === "string" ? `Outstanding ${kpis.formatted_outstanding_debt}` : undefined}
            href={typeof kpis.overdue_href === "string" ? kpis.overdue_href : "/admin/finance"}
          />
          <KpiLinkCard
            title="Active subscriptions"
            value={String(kpis.active_subscriptions_count ?? "—")}
            href={typeof kpis.subscriptions_href === "string" ? kpis.subscriptions_href : "/admin/subscriptions"}
          />
          <KpiLinkCard
            title="Route margin (month)"
            value={str(kpis.formatted_route_margin_month)}
            href={typeof kpis.route_margin_href === "string" ? kpis.route_margin_href : "/admin/reports/route-profitability"}
          />
          <KpiLinkCard title="Average order value" value={str(kpis.formatted_average_order_value)} href="/admin/orders" linkLabel="Orders" />
          <KpiLinkCard
            title="Profit per knife (rough)"
            value={str(kpis.formatted_profit_per_knife)}
            hint={typeof kpis.profit_per_knife_note === "string" ? kpis.profit_per_knife_note : undefined}
          />
          <KpiLinkCard
            title="Cost per knife (proxy)"
            value={str(kpis.formatted_cost_per_knife)}
            hint={typeof kpis.cost_per_knife_note === "string" ? kpis.cost_per_knife_note : undefined}
            href="/admin/reports/route-profitability"
          />
          <KpiLinkCard
            title="ROI proxy (cash ÷ invested pipeline)"
            value={str(kpis.formatted_roi_cash_proxy)}
            href="/admin/reports/cash-position"
            linkLabel="Cash position"
          />
          <KpiLinkCard
            title="Equipment / capex signal"
            value={kpis.equipment_payback_flag === true ? "Threshold crossed" : "No flag"}
            hint={typeof kpis.equipment_payback_note === "string" ? kpis.equipment_payback_note : undefined}
            href="/admin/reports/cash-position"
            linkLabel="Assumptions"
          />
          <KpiLinkCard
            title="New companies"
            value={String(kpis.customer_growth_month ?? "—")}
            href={typeof kpis.customer_growth_href === "string" ? kpis.customer_growth_href : "/admin/crm"}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Forecasts & models</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {forecastLinks.map((row, i) => {
            const title = typeof row.title === "string" ? row.title : "Forecast";
            const href = typeof row.href === "string" ? row.href : "#";
            const description = typeof row.description === "string" ? row.description : "";
            return (
              <Card key={i} className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">{title}</CardTitle>
                  {description ? <CardDescription>{description}</CardDescription> : null}
                </CardHeader>
                <CardContent>
                  <Link href={href} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                    Open
                    <ArrowUpRight className="ml-1 inline h-3 w-3" aria-hidden />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <Separator />

      <section className="space-y-2 text-xs leading-relaxed text-muted-foreground">
        <p>{typeof d?.disclaimer === "string" ? d.disclaimer : ""}</p>
        {d?.definitions && typeof d.definitions === "object" ? (
          <details className="rounded-lg border bg-card p-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground">Definitions</summary>
            <div className="mt-2 space-y-1">
              {Object.entries(d.definitions).map(([k, text]) => (
                <p key={k}>
                  <span className="font-medium text-foreground">{k}</span>: {text}
                </p>
              ))}
            </div>
          </details>
        ) : null}
      </section>
    </div>
  );
}
