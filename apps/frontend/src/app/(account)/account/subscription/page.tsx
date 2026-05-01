"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Mail, Phone, Repeat, User } from "lucide-react";

import { AccountSubscriptionResponseSchema } from "@/lib/api/account-schema";
import { useAccountApi } from "@/lib/api/use-account-api";
import { formatGBP } from "@/lib/format/money";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerInvoiceStatusBadge } from "@/components/invoices/CustomerInvoiceStatusBadge";

function invoiceTitle(inv: {
  display_reference?: string | null;
  invoice_number?: string | null;
}): string {
  if (inv.display_reference?.trim()) {
    return inv.display_reference.trim();
  }
  if (inv.invoice_number?.trim()) {
    return `Invoice ${inv.invoice_number.trim()}`;
  }
  return "Invoice";
}

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
  const pu = sub?.period_usage;
  const hasUsageActivity = pu?.has_activity === true;

  return (
    <div className="space-y-8">
      <Breadcrumbs homeHref="/account/dashboard" items={[{ label: "Your plan" }]} />
      <PageHeader
        title="Your plan"
        description="Everything about your WeSharp programme in one place. To change your plan or billing setup, please reach out to our team — you can’t do that from here yet."
      />

      {query.status === "pending" ? (
        <div className="flex min-h-[24vh] flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          <p className="text-base">Loading…</p>
        </div>
      ) : query.isError ? (
        <p className="text-base text-destructive">{(query.error as Error).message}</p>
      ) : sub ? (
        <div className="space-y-6">
          {sub.overage_warning ? (
            <Alert className="border-amber-500/40 bg-amber-500/5">
              <AlertTitle className="text-base">Heads up about usage this period</AlertTitle>
              <AlertDescription className="text-base text-muted-foreground">{sub.overage_warning}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="rounded-xl border shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Repeat className="h-5 w-5 text-primary" aria-hidden />
                  {sub.plan_name}
                </CardTitle>
                <CardDescription className="text-base">Your company’s active programme with WeSharp.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 text-base">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Status</span>
                  <Badge variant="secondary" className="text-sm capitalize">
                    {(sub.status_label ?? sub.status ?? "Active").replace(/_/g, " ")}
                  </Badge>
                </div>
                {sub.current_period_end ? (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Renewal date</div>
                    <p className="mt-1 font-medium leading-relaxed">
                      {new Date(sub.current_period_end + "T12:00:00").toLocaleDateString("en-GB", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                ) : null}
                {sub.formatted_price_snapshot_gbp ? (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Plan price (your agreement)</div>
                    <p className="mt-1 text-muted-foreground">
                      {sub.formatted_price_snapshot_gbp} per billing period, before any usage-based charges.
                    </p>
                  </div>
                ) : null}
                {sub.included_services ? (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">What’s included</div>
                    <p className="mt-1 whitespace-pre-wrap leading-relaxed text-muted-foreground">{sub.included_services}</p>
                  </div>
                ) : null}
                {sub.allowance_summary ? (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Allowance</div>
                    <p className="mt-1 leading-relaxed text-muted-foreground">{sub.allowance_summary}</p>
                  </div>
                ) : sub.summary ? (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Summary</div>
                    <p className="mt-1 leading-relaxed text-muted-foreground">{sub.summary}</p>
                  </div>
                ) : null}
                <div className="rounded-lg border bg-muted/25 p-4">
                  <p className="leading-relaxed text-muted-foreground">
                    Questions about your plan or invoice? Email or call us from{" "}
                    <Link href="/account/settings" className="font-medium text-primary underline underline-offset-4">
                      Account details
                    </Link>
                    , or open an invoice below for payment information.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Shortcuts</CardTitle>
                <CardDescription className="text-base">Invoices and your overview.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button type="button" variant="default" size="default" className="h-11 w-full justify-center rounded-lg" asChild>
                  <Link href="/account/invoices">View all invoices</Link>
                </Button>
                <Button type="button" variant="outline" size="default" className="h-11 w-full justify-center rounded-lg" asChild>
                  <Link href="/account/dashboard">Back to overview</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-xl border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Usage this billing period</CardTitle>
              <CardDescription className="text-base">
                {pu?.billing_period_label
                  ? `We track completed work between ${pu.billing_period_label}.`
                  : "We track completed work in your current billing period."}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-base">
              {!pu ? (
                <p className="text-muted-foreground">Usage details will appear when your plan and billing period are set up.</p>
              ) : !hasUsageActivity ? (
                <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center">
                  <p className="font-medium text-foreground">No completed usage yet this period</p>
                  <p className="mt-2 text-muted-foreground">
                    After we complete a collection for you, visits and knives counted toward your allowance will show here.
                  </p>
                  <Button type="button" className="mt-6 rounded-lg" variant="secondary" asChild>
                    <Link href="/account/orders">View your orders</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {sub.usage_summary_line ? (
                    <p className="leading-relaxed text-foreground">{sub.usage_summary_line}</p>
                  ) : null}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border bg-muted/15 p-4">
                      <div className="text-sm font-medium text-muted-foreground">Collection visits</div>
                      <p className="mt-1 text-lg font-semibold tabular-nums">
                        {pu.collections_used}
                        {pu.included_collections != null ? ` / ${pu.included_collections} included` : ""}
                      </p>
                      {(pu.collections_overage_units ?? 0) > 0 ? (
                        <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                          +{pu.collections_overage_units} beyond included visits (may be billed as extra)
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-lg border bg-muted/15 p-4">
                      <div className="text-sm font-medium text-muted-foreground">Knives (allowance)</div>
                      <p className="mt-1 text-lg font-semibold tabular-nums">
                        {pu.knives_used}
                        {pu.included_knife_allowance != null ? ` / ${pu.included_knife_allowance} included` : ""}
                      </p>
                      {(pu.knives_overage_units ?? 0) > 0 ? (
                        <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                          +{pu.knives_overage_units} beyond included knives (may be billed as extra)
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {(pu.estimated_overage_pence ?? 0) > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Estimated extra usage this period:{" "}
                      <span className="font-semibold text-foreground tabular-nums">
                        {pu.formatted_estimated_overage_gbp ?? formatGBP(pu.estimated_overage_pence ?? null)}
                      </span>
                      . Final amounts are always on your invoice.
                    </p>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>

          {sub.billing_contact &&
          (sub.billing_contact.name || sub.billing_contact.email || sub.billing_contact.phone) ? (
            <Card className="rounded-xl border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Billing contact</CardTitle>
                <CardDescription className="text-base">Who we use for programme and invoice questions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-base">
                {sub.billing_contact.name ? (
                  <p className="flex items-start gap-2">
                    <User className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                    <span>{sub.billing_contact.name}</span>
                  </p>
                ) : null}
                {sub.billing_contact.email ? (
                  <p className="flex items-start gap-2">
                    <Mail className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                    <a className="font-medium text-primary underline underline-offset-4" href={`mailto:${sub.billing_contact.email}`}>
                      {sub.billing_contact.email}
                    </a>
                  </p>
                ) : null}
                {sub.billing_contact.phone ? (
                  <p className="flex items-start gap-2">
                    <Phone className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                    <a className="font-medium text-primary underline underline-offset-4" href={`tel:${sub.billing_contact.phone.replace(/\s+/g, "")}`}>
                      {sub.billing_contact.phone}
                    </a>
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card className="rounded-xl border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Subscription invoices</CardTitle>
              <CardDescription className="text-base">
                Invoices raised for your programme (plan charges and any usage for the period).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!sub.recent_invoices || sub.recent_invoices.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center text-base text-muted-foreground">
                  <p className="font-medium text-foreground">No subscription invoices yet</p>
                  <p className="mt-2">When we raise a programme invoice, it will appear here with the billing period and amount.</p>
                  <Button type="button" className="mt-6 rounded-lg" variant="secondary" asChild>
                    <Link href="/account/invoices">Browse all invoices</Link>
                  </Button>
                </div>
              ) : (
                <ul className="divide-y rounded-xl border">
                  {sub.recent_invoices.map((inv) => (
                    <li key={inv.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="text-base font-semibold leading-snug">{invoiceTitle(inv)}</div>
                        {inv.billing_period_label ? (
                          <div className="text-sm text-muted-foreground">Billing period: {inv.billing_period_label}</div>
                        ) : null}
                        <div className="text-sm text-muted-foreground">
                          {inv.issue_date ? `Issued ${inv.issue_date}` : null}
                          {inv.issue_date && inv.due_date ? " · " : null}
                          {inv.due_date ? `Due ${inv.due_date}` : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <span className="text-base font-semibold tabular-nums">
                          {inv.formatted_total ?? formatGBP(inv.total_pence)}
                        </span>
                        <CustomerInvoiceStatusBadge
                          status={inv.status}
                          customerLabel={inv.customer_status_label}
                          hint={inv.customer_status_hint}
                        />
                        <Button type="button" variant="secondary" size="sm" className="rounded-lg" asChild>
                          <Link href={`/account/invoices/${inv.id}`}>Open invoice</Link>
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
          <CardContent className="space-y-4 py-12 text-center text-base text-muted-foreground">
            <p className="text-lg font-medium text-foreground">No active plan on this account</p>
            <p>
              When your business is on a WeSharp programme, you&apos;ll see your plan name, renewal date, allowance, and programme
              invoices here.
            </p>
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              <Button type="button" className="h-11 rounded-lg px-6" variant="secondary" asChild>
                <Link href="/pricing">View pricing</Link>
              </Button>
              <Button type="button" className="h-11 rounded-lg px-6" variant="outline" asChild>
                <Link href="/account/invoices">View invoices</Link>
              </Button>
            </div>
            <Button type="button" variant="link" className="h-auto px-0 text-base" asChild>
              <Link href="/account/dashboard">Back to overview</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
