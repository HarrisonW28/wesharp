"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, ClipboardList, Loader2, Receipt } from "lucide-react";
import type { z } from "zod";

import { AccountOrderDetailResponseSchema } from "@/lib/api/account-schema";
import { useAccountApi } from "@/lib/api/use-account-api";
import { customerBookingStatusLabel } from "@/lib/helpers/status-helpers";
import { buildCustomerOrderTimeline, customerOrderNextSteps } from "@/lib/orders/customer-order-ui";
import { formatGBP } from "@/lib/format/money";
import { cn } from "@/lib/utils";

import { CustomerOrderStatusBadge } from "@/components/orders/CustomerOrderStatusBadge";
import { TenantFulfilmentUpdatesCard } from "@/components/orders/TenantFulfilmentUpdatesCard";
import { CustomerOrderFeedbackCard } from "@/components/orders/CustomerOrderFeedbackCard";
import { CustomerActivityTimeline } from "@/components/account/CustomerActivityTimeline";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { CustomerInvoiceStatusBadge } from "@/components/invoices/CustomerInvoiceStatusBadge";
import { StatusBadge, StatusBadgeGroup } from "@/components/status/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AccountOrderDetail = z.infer<typeof AccountOrderDetailResponseSchema>["data"];

function knifeTitle(k: {
  label?: string | null;
  knife_type?: string | null;
  brand?: string | null;
  tag_id?: string | null;
}): string {
  const parts = [k.brand, k.knife_type, k.label].filter((p): p is string => Boolean(p && String(p).trim() !== ""));
  if (parts.length > 0) {
    return parts.join(" · ");
  }
  if (k.tag_id) {
    return `Blade ${k.tag_id}`;
  }
  return "Knife";
}

export default function TenantOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const api = useAccountApi();

  const orderQuery = useQuery({
    queryKey: ["account-order", orderId],
    enabled: Boolean(orderId),
    queryFn: async () => {
      const res = await api.json<unknown>(`/api/account/orders/${orderId}`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = AccountOrderDetailResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        const raw = res.data as { data?: unknown } | null;
        if (raw && typeof raw === "object" && raw.data && typeof raw.data === "object") {
          return raw.data as AccountOrderDetail;
        }
        throw new Error("Unexpected order payload.");
      }
      return parsed.data.data;
    },
  });

  const o = orderQuery.data;
  const useServerFulfilment = Boolean(o?.fulfilment?.timeline && o.fulfilment.timeline.length > 0);
  const timeline = o
    ? useServerFulfilment
      ? null
      : buildCustomerOrderTimeline({ status: o.status, created_at: o.created_at, completed_at: o.completed_at })
    : null;
  const nextSteps = o ? customerOrderNextSteps(o.status) : [];

  return (
    <div className="space-y-8">
      <Breadcrumbs
        homeHref="/account/dashboard"
        items={[{ label: "My orders", href: "/account/orders" }, { label: "Order details" }]}
      />
      <PageHeader
        title={o?.display_reference ?? "Order details"}
        description="Read-only view of this sharpening order — totals match what we bill, shown in GBP."
        titleRowEnd={
          o ? (
            <StatusBadgeGroup className="max-w-md">
              <CustomerOrderStatusBadge status={o.status} />
              <StatusBadge kind="payment" status={o.payment_status} />
            </StatusBadgeGroup>
          ) : null
        }
      />

      {orderQuery.status === "pending" ? (
        <div className="flex min-h-[24vh] flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          <p className="text-sm">Loading order…</p>
        </div>
      ) : orderQuery.isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="text-destructive">{(orderQuery.error as Error).message}</p>
        </div>
      ) : o ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-xl lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
              <CardDescription>Where this order is in our fulfilment flow.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {useServerFulfilment ? (
                <p className="text-sm text-muted-foreground">
                  Live collection and workshop milestones are in the <strong>Updates</strong> section below.
                </p>
              ) : null}
              {timeline ? (
                <ol className="space-y-0">
                  {timeline.steps.map((step) => (
                    <li key={step.id} className="relative border-l border-border pb-8 pl-6 last:border-l-0 last:pb-0">
                      <span
                        className={cn(
                          "absolute left-0 top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-background",
                          step.state === "complete" && "bg-emerald-500",
                          step.state === "current" && "bg-primary",
                          step.state === "upcoming" && "bg-muted-foreground/30",
                        )}
                        aria-hidden
                      />
                      <div className="space-y-1">
                        <div className="font-medium leading-tight">{step.label}</div>
                        {step.description ? <p className="text-sm text-muted-foreground">{step.description}</p> : null}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : null}
              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Next steps</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {nextSteps.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">Totals</CardTitle>
              <CardDescription>Amounts in GBP (including VAT where shown).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">{formatGBP(o.subtotal_pence ?? null)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">VAT</span>
                <span className="tabular-nums">{formatGBP(o.tax_pence ?? null)}</span>
              </div>
              <div className="flex justify-between gap-4 border-t pt-3 font-medium">
                <span>Total</span>
                <span className="tabular-nums">{formatGBP(o.total_pence ?? null)}</span>
              </div>
              {o.knife_count != null ? (
                <p className="text-xs text-muted-foreground">Covers {o.knife_count} knife{o.knife_count === 1 ? "" : "s"} on this order.</p>
              ) : null}
            </CardContent>
          </Card>

          {o.booking?.id ? (
            <Card className="rounded-xl lg:col-span-3">
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-muted-foreground" aria-hidden />
                    Related booking
                  </CardTitle>
                  <CardDescription>The collection this order came from.</CardDescription>
                </div>
                <Button size="sm" variant="outline" className="rounded-lg shrink-0" asChild>
                  <Link href={`/account/bookings/${o.booking.id}`}>View booking</Link>
                </Button>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4 text-sm">
                {o.booking.scheduled_date ? (
                  <div>
                    <div className="text-muted-foreground">Collection day</div>
                    <div className="font-medium">
                      {new Date(o.booking.scheduled_date + "T12:00:00").toLocaleDateString("en-GB")}
                    </div>
                  </div>
                ) : null}
                {o.booking.status ? (
                  <div>
                    <div className="text-muted-foreground">Booking status</div>
                    <div className="font-medium">{customerBookingStatusLabel(o.booking.status)}</div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <CustomerOrderFeedbackCard orderId={String(orderId)} feedback={o.feedback} />

          {o.invoice ? (
            <Card className="rounded-xl lg:col-span-3">
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-muted-foreground" aria-hidden />
                    Invoice
                  </CardTitle>
                  <CardDescription>
                    {o.invoice.invoice_number ? (
                      <>Invoice {o.invoice.invoice_number}</>
                    ) : (
                      <>Bill linked to this order</>
                    )}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <CustomerInvoiceStatusBadge
                    status={o.invoice.status}
                    customerLabel={o.invoice.customer_status_label}
                    hint={o.invoice.customer_status_hint}
                  />
                  <Button size="sm" className="rounded-lg" asChild>
                    <Link href={`/account/invoices/${o.invoice.id}`}>View invoice</Link>
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-lg" asChild>
                    <Link href="/account/invoices">All invoices</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <div className="text-muted-foreground">Subtotal</div>
                  <div className="tabular-nums font-medium">{o.invoice.formatted_subtotal}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">VAT</div>
                  <div className="tabular-nums font-medium">{o.invoice.formatted_tax}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Total</div>
                  <div className="tabular-nums font-medium">{o.invoice.formatted_total}</div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <TenantFulfilmentUpdatesCard
            fulfilment={o.fulfilment}
            customerMessages={o.customer_messages}
            photos={o.photos}
          />

          <CustomerActivityTimeline
            title="What we’ve recorded"
            emptyHint="Updates to this order — workshop progress, invoicing, and payments — show here in plain language."
            items={o.activity_timeline ?? []}
          />

          <Card className="rounded-xl lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">Line items</CardTitle>
              <CardDescription>What you’re being charged for on this order.</CardDescription>
            </CardHeader>
            <CardContent>
              {o.subscription_coverage?.mode === "subscription" ? (
                <div className="mb-4 rounded-lg border bg-muted/20 p-4 text-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Subscription coverage</p>
                  <p className="mt-2 text-muted-foreground">
                    {o.subscription_coverage.included_summary ??
                      "Some line items may be included in your subscription allowance for this billing period."}
                  </p>
                </div>
              ) : null}
              {!o.items || o.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Detailed lines will appear once billable items are added. Totals above may still reflect your batch.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Description</th>
                        <th className="px-3 py-2 text-left font-medium">Subscription</th>
                        <th className="px-3 py-2 text-right font-medium">Qty</th>
                        <th className="px-3 py-2 text-right font-medium">Unit</th>
                        <th className="px-3 py-2 text-right font-medium">Line</th>
                      </tr>
                    </thead>
                    <tbody>
                      {o.items.map((row, idx) => (
                        <tr key={`${idx}-${row.description.slice(0, 24)}`} className="border-t">
                          <td className="px-3 py-2">{row.description}</td>
                          <td className="px-3 py-2">
                            {row.subscription_billing_kind === "included" ? (
                              <div className="space-y-1">
                                <Badge variant="success">Included</Badge>
                                {row.subscription_billing_note ? (
                                  <p className="text-xs text-muted-foreground">{row.subscription_billing_note}</p>
                                ) : null}
                              </div>
                            ) : row.subscription_billing_kind === "overage" ? (
                              <div className="space-y-1">
                                <Badge variant="warning">Overage</Badge>
                                {row.subscription_billing_note ? (
                                  <p className="text-xs text-muted-foreground">{row.subscription_billing_note}</p>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{row.quantity}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{row.formatted_unit_amount}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-medium">{row.formatted_line_total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-muted-foreground" aria-hidden />
                Knives on this order
              </CardTitle>
              <CardDescription>Blades we’ve registered to your batch (tag or label when available).</CardDescription>
            </CardHeader>
            <CardContent>
              {!o.knives || o.knives.length === 0 ? (
                <p className="text-sm text-muted-foreground">No blades listed yet — they’ll show up as we log them in the workshop.</p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {o.knives.map((k, idx) => (
                    <li key={`${idx}-${k.tag_id ?? k.label ?? "k"}`} className="flex flex-col gap-3 px-3 py-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="font-medium leading-tight">{knifeTitle(k)}</div>
                          {k.tag_id ? <p className="text-xs text-muted-foreground">Tag {k.tag_id}</p> : null}
                        </div>
                        <StatusBadge kind="knife" status={k.status} />
                      </div>
                      {k.inspection ? (
                        <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
                          <p className="text-xs font-semibold uppercase text-muted-foreground">
                            {k.inspection.heading ?? "Workshop inspection"}
                          </p>
                          {k.inspection.condition ? (
                            <p className="mt-1 text-muted-foreground">
                              <span className="font-medium text-foreground">Condition:</span> {k.inspection.condition}
                            </p>
                          ) : null}
                          {k.inspection.notes ? (
                            <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{k.inspection.notes}</p>
                          ) : null}
                          {k.inspection.inspected_at ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {new Date(k.inspection.inspected_at).toLocaleString("en-GB")}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                      {(k.damage_reports ?? []).length > 0 ? (
                        <ul className="space-y-2 text-sm">
                          {(k.damage_reports ?? []).map((d, j) => (
                            <li key={`${idx}-dmg-${j}`} className="rounded-md border border-border/80 bg-background/50 px-3 py-2">
                              <p className="text-xs text-muted-foreground">
                                {d.severity_label ?? d.severity ?? "Update"}
                                {d.status_label ? ` · ${d.status_label}` : null}
                              </p>
                              {d.description ? (
                                <p className="mt-1 whitespace-pre-wrap text-foreground">{d.description}</p>
                              ) : null}
                              {d.resolved_at ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Updated {new Date(d.resolved_at).toLocaleDateString("en-GB")}
                                </p>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-3">
            <Link className="text-sm font-medium text-primary underline underline-offset-2" href="/account/orders">
              Back to my orders
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
