"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Repeat } from "lucide-react";

import { AccountSubscriptionResponseSchema } from "@/lib/api/account-schema";
import { useAccountApi } from "@/lib/api/use-account-api";
import { formatGBP } from "@/lib/format/money";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerInvoiceStatusBadge } from "@/components/invoices/CustomerInvoiceStatusBadge";

export default function AccountSubscriptionPage() {
  const api = useAccountApi();

  const query = useQuery({
    queryKey: ["account-subscription"],
    queryFn: async () => {
      const res = await api.json<unknown>("/api/account/subscription");
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = AccountSubscriptionResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected subscription payload.");
      }
      return parsed.data.data.subscription;
    },
  });

  const sub = query.data;

  return (
    <div className="space-y-8">
      <Breadcrumbs homeHref="/account/dashboard" items={[{ label: "Your plan" }]} />
      <PageHeader
        title="Your plan"
        description="What you’re subscribed to with WeSharp — read-only; changes go through our team for now."
      />

      {query.status === "pending" ? (
        <div className="flex min-h-[24vh] flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          <p className="text-sm">Loading…</p>
        </div>
      ) : query.isError ? (
        <p className="text-sm text-destructive">{(query.error as Error).message}</p>
      ) : sub ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="rounded-xl border shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Repeat className="h-4 w-4 text-primary" aria-hidden />
                {sub.plan_name}
              </CardTitle>
              <CardDescription>Current programme on your company account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {sub.status ? (
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</div>
                  <Badge variant="secondary" className="mt-1 w-fit capitalize">
                    {sub.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              ) : null}
              {sub.current_period_end ? (
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Renewal date</div>
                  <p className="mt-1 font-medium">
                    {new Date(sub.current_period_end + "T12:00:00").toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              ) : null}
              {sub.included_services ? (
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">What’s included</div>
                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{sub.included_services}</p>
                </div>
              ) : null}
              {sub.allowance_summary ? (
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Allowance</div>
                  <p className="mt-1 text-muted-foreground">{sub.allowance_summary}</p>
                </div>
              ) : null}
              <div className="rounded-lg border bg-muted/20 p-4 text-muted-foreground">
                <p className="text-sm">
                  To change or cancel your plan, contact us from{" "}
                  <Link href="/account/settings" className="font-medium text-primary underline underline-offset-2">
                    Settings
                  </Link>
                  — self-serve changes aren’t available here yet.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Quick links</CardTitle>
              <CardDescription>Invoices and collections.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button type="button" variant="outline" size="sm" className="rounded-lg w-full justify-start" asChild>
                <Link href="/account/invoices">All invoices</Link>
              </Button>
              <Button type="button" variant="outline" size="sm" className="rounded-lg w-full justify-start" asChild>
                <Link href="/account/dashboard">Overview</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-xl border shadow-sm lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">Recent subscription invoices</CardTitle>
              <CardDescription>Billing tied to your plan (when we’ve raised them).</CardDescription>
            </CardHeader>
            <CardContent>
              {!sub.recent_invoices || sub.recent_invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No subscription invoices yet.</p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {sub.recent_invoices.map((inv) => (
                    <li
                      key={inv.id}
                      className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="font-medium tabular-nums">{inv.invoice_number ?? "Invoice"}</div>
                        <div className="text-xs text-muted-foreground">
                          {inv.issue_date ? `Issued ${inv.issue_date}` : null}
                          {inv.due_date ? ` · Due ${inv.due_date}` : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="tabular-nums text-sm">{inv.formatted_total ?? formatGBP(inv.total_pence)}</span>
                        {inv.status ? (
                            <CustomerInvoiceStatusBadge
                              status={inv.status}
                              customerLabel={inv.customer_status_label}
                              hint={inv.customer_status_hint}
                            />
                          ) : null}
                        <Button type="button" variant="link" className="h-auto px-0" asChild>
                          <Link href={`/account/invoices/${inv.id}`}>View</Link>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="rounded-xl border border-dashed bg-muted/20 shadow-sm">
          <CardContent className="py-10 text-center text-muted-foreground">
            <p className="text-sm">No active plan yet.</p>
            <p className="mt-2 text-sm">When you join a WeSharp programme, your plan name, renewal date, and benefits will show here.</p>
            <Button type="button" className="mt-6 rounded-lg" variant="secondary" asChild>
              <Link href="/pricing">View pricing</Link>
            </Button>
            <div className="mt-4">
              <Button type="button" variant="link" className="h-auto px-0" asChild>
                <Link href="/account/dashboard">Back to overview</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
