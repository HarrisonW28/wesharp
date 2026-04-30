"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, ClipboardList, Loader2, Receipt } from "lucide-react";

import { AccountOrderDetailResponseSchema } from "@/lib/api/account-schema";
import { useAccountApi } from "@/lib/api/use-account-api";
import { customerBookingStatusLabel } from "@/lib/helpers/status-helpers";
import { buildCustomerOrderTimeline, customerOrderNextSteps } from "@/lib/orders/customer-order-ui";
import { formatGBP } from "@/lib/format/money";
import { cn } from "@/lib/utils";

import { CustomerOrderStatusBadge } from "@/components/orders/CustomerOrderStatusBadge";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { CustomerInvoiceStatusBadge } from "@/components/invoices/CustomerInvoiceStatusBadge";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
        throw new Error("Unexpected order payload.");
      }
      return parsed.data.data;
    },
  });

  const o = orderQuery.data;
  const timeline = o ? buildCustomerOrderTimeline({ status: o.status, created_at: o.created_at, completed_at: o.completed_at }) : null;
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
              <div className="flex flex-wrap items-center gap-2">
                <CustomerOrderStatusBadge status={o.status} />
                <span className="text-sm text-muted-foreground">Payment</span>
                <StatusBadge kind="payment" status={o.payment_status} />
              </div>
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
                  <CustomerInvoiceStatusBadge status={o.invoice.status} />
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

          <Card className="rounded-xl lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">Line items</CardTitle>
              <CardDescription>What you’re being charged for on this order.</CardDescription>
            </CardHeader>
            <CardContent>
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
                        <th className="px-3 py-2 text-right font-medium">Qty</th>
                        <th className="px-3 py-2 text-right font-medium">Unit</th>
                        <th className="px-3 py-2 text-right font-medium">Line</th>
                      </tr>
                    </thead>
                    <tbody>
                      {o.items.map((row, idx) => (
                        <tr key={`${idx}-${row.description.slice(0, 24)}`} className="border-t">
                          <td className="px-3 py-2">{row.description}</td>
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
                    <li key={`${idx}-${k.tag_id ?? k.label ?? "k"}`} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="font-medium leading-tight">{knifeTitle(k)}</div>
                        {k.tag_id ? <p className="text-xs text-muted-foreground">Tag {k.tag_id}</p> : null}
                      </div>
                      <StatusBadge kind="knife" status={k.status} />
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
