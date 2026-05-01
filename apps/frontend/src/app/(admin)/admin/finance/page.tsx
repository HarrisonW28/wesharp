"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";

import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { FinanceDashboardResponseSchema } from "@/lib/api/admin-finance-schema";
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
    <Card className="min-h-[120px] shadow-sm">
      <CardHeader className="pb-1">
        <CardTitle className="text-base font-medium text-muted-foreground">{props.title}</CardTitle>
        {props.hint ? <CardDescription className="text-sm">{props.hint}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">{props.value}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminFinanceDashboardPage() {
  const admin = useAdminApi();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const dateFrom = searchParams.get("date_from") ?? "";
  const dateTo = searchParams.get("date_to") ?? "";
  const companyId = searchParams.get("company_id") ?? "";
  const invoiceStatus = searchParams.get("invoice_status") ?? "";

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

  const dashboardQs = useMemo(
    () =>
      buildQs({
        date_from: dateFrom,
        date_to: dateTo,
        company_id: companyId,
        invoice_status: invoiceStatus,
      }),
    [companyId, dateFrom, dateTo, invoiceStatus],
  );

  const dashboardQuery = useQuery({
    queryKey: ["admin-finance-dashboard", dashboardQs],
    queryFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/finance/dashboard${dashboardQs}`);
      if (!res.ok) throw new Error(res.message);
      const parsed = FinanceDashboardResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected finance dashboard payload.");
      return parsed.data.data;
    },
  });

  const companiesQuery = useQuery({
    queryKey: ["admin-lookups-companies-finance"],
    queryFn: async () => {
      const res = await admin.json<unknown>("/api/admin/lookups/companies");
      if (!res.ok) throw new Error(res.message);
      const items = (res.data as { data?: { items?: CompanyOpt[] } })?.data?.items;
      return Array.isArray(items) ? items : [];
    },
  });

  useEffect(() => {
    if (dashboardQuery.isError) toast.error((dashboardQuery.error as Error).message);
  }, [dashboardQuery.error, dashboardQuery.isError]);

  const data = dashboardQuery.data;
  const defaultPeriodHint = data?.period
    ? `${data.period.date_from} → ${data.period.date_to} (${data.period.timezone})`
    : undefined;

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Finance", href: "/admin/finance" },
        ]}
      />
      <PageHeader
        title="Finance dashboard"
        description="Billing KPIs, overdue AR, and recent cash — amounts in GBP from the server."
        actions={
          <Button asChild variant="outline" className="text-base">
            <Link href="/admin/reports/sales">Sales &amp; revenue report</Link>
          </Button>
        }
      />

      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription className="text-base">Refine metrics and lists. Outstanding figures follow filter; paid totals use the date range.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="fin-from" className="text-base">
              Period from
            </Label>
            <Input
              id="fin-from"
              type="date"
              className="h-11 text-base"
              value={dateFrom}
              onChange={(e) => setFilter({ date_from: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fin-to" className="text-base">
              Period to
            </Label>
            <Input
              id="fin-to"
              type="date"
              className="h-11 text-base"
              value={dateTo}
              onChange={(e) => setFilter({ date_to: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-base">Company</Label>
            <Select
              value={companyId || "__all__"}
              onValueChange={(v) => setFilter({ company_id: v === "__all__" ? "" : v })}
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
            <Label className="text-base">Invoice status</Label>
            <Select value={invoiceStatus || "__all__"} onValueChange={(v) => setFilter({ invoice_status: v === "__all__" ? "" : v })}>
              <SelectTrigger className="h-11 text-base">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-base">
                  All statuses
                </SelectItem>
                {(["draft", "sent", "overdue", "paid", "void"] as const).map((s) => (
                  <SelectItem key={s} value={s} className="text-base">
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-end gap-2 md:col-span-2 lg:col-span-4">
            <Button
              type="button"
              variant="outline"
              className="text-base"
              onClick={() => {
                setFilter({ date_from: "", date_to: "", company_id: "", invoice_status: "" });
              }}
            >
              Clear filters
            </Button>
            <Button type="button" variant="secondary" className="text-base" onClick={() => void dashboardQuery.refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {dashboardQuery.isPending ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border bg-card text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin" aria-hidden />
          <p className="text-base">Loading finance metrics…</p>
        </div>
      ) : dashboardQuery.isError ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" aria-hidden />
          <p className="text-base text-destructive">{(dashboardQuery.error as Error).message}</p>
          <Button type="button" onClick={() => void dashboardQuery.refetch()}>
            Retry
          </Button>
        </div>
      ) : data ? (
        <>
          {data.kpis_note ? <p className="text-base text-muted-foreground">{data.kpis_note}</p> : null}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <KpiCard title="Outstanding balance" value={data.kpis.formatted_outstanding} hint="Open AR (snapshot)" />
            <KpiCard title="Unpaid invoices" value={String(data.kpis.unpaid_invoice_count)} hint="Issued, balance &gt; 0" />
            <KpiCard title="Overdue invoices" value={String(data.kpis.overdue_invoice_count)} hint="Past due date" />
            <KpiCard title="Draft invoices" value={String(data.kpis.draft_invoice_count)} hint="Need review / issue" />
            <KpiCard title="Voids (period)" value={String(data.kpis.void_invoice_count_period)} hint="Void activity in range" />
            <KpiCard title="Paid in period" value={data.kpis.formatted_paid_in_period} hint={defaultPeriodHint} />
            <KpiCard
              title="Payments in period"
              value={String(data.kpis.payment_count_in_period)}
              hint="Cash / recorded rows"
            />
            <KpiCard
              title="Subscription-tagged payments"
              value={data.kpis.formatted_subscription_tagged_payments_in_period}
              hint="Real payments on subscription-flagged invoices (not MRR model)"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upcoming renewals</CardTitle>
                <CardDescription className="text-base">From company subscriptions (next 30 days).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!data.subscription.has_subscription_rows ? (
                  <p className="text-base text-muted-foreground">No subscription rows in the system.</p>
                ) : data.subscription.upcoming_renewals.length === 0 ? (
                  <p className="text-base text-muted-foreground">No renewals in the next 30 days.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.subscription.upcoming_renewals.map((r) => (
                      <li key={`${r.company_id}-${r.renews_on}`} className="flex flex-wrap items-baseline justify-between gap-2 text-base">
                        <Link href={`/admin/crm/${r.company_id}`} className="font-medium text-primary underline">
                          {r.company_name ?? "Company"}
                        </Link>
                        <span className="text-muted-foreground">
                          {r.plan_name ?? "Plan"} · {r.renews_on ?? "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Integrations</CardTitle>
                <CardDescription className="text-base">Placeholders until Xero / Stripe ops are wired.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-base">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="font-semibold">Xero</div>
                  <p className="mt-1 text-muted-foreground">{data.integrations.xero.message}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="font-semibold">Stripe</div>
                  <p className="mt-1 text-muted-foreground">{data.integrations.stripe.message}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">Customers — highest outstanding</h2>
            {data.top_outstanding_companies.length === 0 ? (
              <p className="text-base text-muted-foreground">No outstanding balances for this filter.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[520px] text-left text-base">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Customer</th>
                      <th className="px-4 py-3 font-semibold text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_outstanding_companies.map((row) => (
                      <tr key={row.company_id} className="border-b last:border-0">
                        <td className="px-4 py-3">
                          <Link href={`/admin/crm/${row.company_id}`} className="font-medium text-primary underline">
                            {row.company_name ?? row.company_id}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">{row.formatted_outstanding}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">Overdue invoices</h2>
            {data.overdue_invoices.length === 0 ? (
              <p className="text-base text-muted-foreground">No overdue invoices for this filter.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[640px] text-left text-base">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Invoice</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Due</th>
                      <th className="px-4 py-3 font-semibold text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.overdue_invoices.map((inv) => (
                      <tr key={inv.id} className="border-b last:border-0">
                        <td className="px-4 py-3">
                          <Link href={`/admin/invoices/${inv.id}`} className="font-medium text-primary underline">
                            {inv.display_reference ?? inv.invoice_number ?? inv.id}
                          </Link>
                          {inv.company_name ? <div className="text-sm text-muted-foreground">{inv.company_name}</div> : null}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge kind="invoice" status={inv.status ?? ""} />
                        </td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">{inv.due_date ?? "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">
                          {inv.formatted_outstanding ?? formatGBP(inv.outstanding_pence ?? 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">Draft invoices needing review</h2>
            {data.draft_invoices.length === 0 ? (
              <p className="text-base text-muted-foreground">No draft invoices for this filter.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[640px] text-left text-base">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Invoice</th>
                      <th className="px-4 py-3 font-semibold">Updated</th>
                      <th className="px-4 py-3 font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.draft_invoices.map((inv) => (
                      <tr key={inv.id} className="border-b last:border-0">
                        <td className="px-4 py-3">
                          <Link href={`/admin/invoices/${inv.id}`} className="font-medium text-primary underline">
                            {inv.display_reference ?? inv.invoice_number ?? inv.id}
                          </Link>
                          {inv.company_name ? <div className="text-sm text-muted-foreground">{inv.company_name}</div> : null}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{inv.updated_at ? new Date(inv.updated_at).toLocaleString("en-GB") : "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">
                          {inv.formatted_amount ?? formatGBP(inv.total ?? 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">Recent payments</h2>
            {data.recent_payments.length === 0 ? (
              <p className="text-base text-muted-foreground">No recent payments.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[720px] text-left text-base">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Amount</th>
                      <th className="px-4 py-3 font-semibold">Invoice</th>
                      <th className="px-4 py-3 font-semibold">Method</th>
                      <th className="px-4 py-3 font-semibold">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_payments.map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-semibold tabular-nums">{formatGBP(p.amount ?? 0)}</td>
                        <td className="px-4 py-3">
                          {p.invoice_id ? (
                            <Link href={`/admin/invoices/${p.invoice_id}`} className="text-primary underline">
                              {p.invoice?.invoice_number ?? "View invoice"}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 capitalize text-muted-foreground">{(p.method ?? "").replace(/_/g, " ") || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {p.paid_at ? new Date(p.paid_at).toLocaleString("en-GB") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
