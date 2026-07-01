"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Repeat } from "lucide-react";

import { AdminSubscriptionDashboardResponseSchema } from "@/lib/api/admin-subscription-dashboard-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";

import { NavBreadcrumbs } from "@/components/layout/NavBreadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminSubscriptionsDashboardPage() {
  const admin = useAdminApi();
  const q = useQuery({
    queryKey: ["admin-subscription-dashboard"],
    queryFn: async () => {
      const res = await admin.json<unknown>("/api/admin/subscription-billing/dashboard");
      if (!res.ok) throw new Error(res.message);
      const parsed = AdminSubscriptionDashboardResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected subscription dashboard payload.");
      return parsed.data.data;
    },
  });

  const d = q.data;

  return (
    <div className="space-y-8">
      <NavBreadcrumbs />
      <PageHeader
        title="Subscriptions"
        description="Operational programme subscriptions — who renews next, and who needs attention after their renewal date."
      />

      {q.status === "pending" ? (
        <div className="flex min-h-[24vh] flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          <p className="text-base">Loading…</p>
        </div>
      ) : q.isError ? (
        <p className="text-base text-destructive">{(q.error as Error).message}</p>
      ) : d ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="rounded-xl border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Active</CardTitle>
                <CardDescription>Status: active</CardDescription>
              </CardHeader>
              <CardContent className="text-2xl font-semibold tabular-nums">{d.kpis.active_subscriptions}</CardContent>
            </Card>
            <Card className="rounded-xl border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Past due</CardTitle>
                <CardDescription>Renewal date passed (internal flag)</CardDescription>
              </CardHeader>
              <CardContent className="text-2xl font-semibold tabular-nums">{d.kpis.past_due_subscriptions}</CardContent>
            </Card>
            <Card className="rounded-xl border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Operational total</CardTitle>
                <CardDescription>Active + past due (billing slots)</CardDescription>
              </CardHeader>
              <CardContent className="text-2xl font-semibold tabular-nums">{d.kpis.operational_subscriptions}</CardContent>
            </Card>
          </div>

          <Card className="rounded-xl border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Repeat className="h-5 w-5 text-primary" aria-hidden />
                Renewals &amp; status
              </CardTitle>
              <CardDescription>Sorted by renewal date. Open a company to roll billing periods or draft invoices.</CardDescription>
            </CardHeader>
            <CardContent>
              {d.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No operational subscriptions for this workspace.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border">
                  <table summary="Operational subscriptions" className="w-full min-w-[720px] text-sm">
                    <thead className="border-b bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">Company</th>
                        <th className="px-3 py-2">Plan</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Renews</th>
                        <th className="px-3 py-2 text-right">Plan charge</th>
                        <th className="px-3 py-2 text-right">CRM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {d.items.map((row) => (
                        <tr key={row.subscription_id} className="bg-background">
                          <td className="px-3 py-2 font-medium">{row.company_name ?? "—"}</td>
                          <td className="px-3 py-2">{row.plan_name}</td>
                          <td className="px-3 py-2">
                            <Badge variant={row.status === "past_due" ? "destructive" : "secondary"} className="capitalize">
                              {row.status_label}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 tabular-nums text-muted-foreground">{row.renews_at ?? "—"}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{row.formatted_price_snapshot_gbp ?? "—"}</td>
                          <td className="px-3 py-2 text-right">
                            <Link className="font-medium text-primary underline-offset-4 hover:underline" href={row.crm_path_hint}>
                              Open
                            </Link>
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
      ) : null}
    </div>
  );
}
