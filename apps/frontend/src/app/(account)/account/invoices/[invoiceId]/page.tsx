"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Download, Loader2, Printer, Receipt } from "lucide-react";

import { AccountInvoiceDetailResponseSchema } from "@/lib/api/account-schema";
import { useAccountApi } from "@/lib/api/use-account-api";
import { CustomerOrderStatusBadge } from "@/components/orders/CustomerOrderStatusBadge";
import { formatGBP } from "@/lib/format/money";

import { CustomerInvoiceStatusBadge } from "@/components/invoices/CustomerInvoiceStatusBadge";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function AccountInvoiceDetailPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const api = useAccountApi();

  const query = useQuery({
    queryKey: ["account-invoice", invoiceId],
    enabled: Boolean(invoiceId),
    queryFn: async () => {
      const res = await api.json<unknown>(`/api/account/invoices/${invoiceId}`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = AccountInvoiceDetailResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected invoice payload.");
      }
      return parsed.data.data;
    },
  });

  const inv = query.data;
  const showPayCta = Boolean(
    inv &&
      inv.payment &&
      !inv.payment.online_checkout_available &&
      (inv.amount_due_pence ?? 0) > 0 &&
      inv.status !== "void" &&
      inv.status !== "paid",
  );

  return (
    <div className="space-y-8 print:space-y-4">
      <Breadcrumbs
        homeHref="/account/dashboard"
        items={[{ label: "Invoices", href: "/account/invoices" }, { label: "Invoice details" }]}
      />
      <PageHeader
        title={inv?.display_reference ?? "Invoice"}
        description={
          inv?.company_name ? (
            <>
              Bill to <span className="font-medium text-foreground">{inv.company_name}</span>. Amounts in GBP.
            </>
          ) : (
            "Amounts in GBP."
          )
        }
        actions={
          inv ? (
            <div className="flex flex-wrap gap-2 print:hidden">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-lg gap-1.5"
                      onClick={() => {
                        if (typeof globalThis.window !== "undefined") {
                          globalThis.window.print();
                        }
                      }}
                      disabled={inv.documents?.print_available === false}
                    >
                      <Printer className="h-4 w-4" aria-hidden />
                      Print
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Uses your browser&apos;s print dialog</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" size="sm" variant="outline" className="rounded-lg gap-1.5" disabled>
                      <Download className="h-4 w-4" aria-hidden />
                      PDF
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {inv.documents?.pdf_download_available
                      ? "Download PDF"
                      : "PDF download is not available yet — use Print for now."}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ) : null
        }
      />

      {query.status === "pending" ? (
        <div className="flex min-h-[24vh] flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          <p className="text-sm">Loading invoice…</p>
        </div>
      ) : query.isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="text-destructive">{(query.error as Error).message}</p>
        </div>
      ) : inv ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-xl lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
              <CardDescription>Document status and what you still owe.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <CustomerInvoiceStatusBadge status={inv.status} />
                {inv.overdue ? (
                  <span className="text-xs font-medium text-destructive">Past due date</span>
                ) : null}
              </div>
              {inv.payment_status ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">Payment</span>
                  <StatusBadge kind="payment" status={inv.payment_status} />
                </div>
              ) : null}
              <dl className="grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Issued</dt>
                  <dd className="font-medium">{inv.issue_date ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Due</dt>
                  <dd className="font-medium">{inv.due_date ?? "—"}</dd>
                </div>
              </dl>
              {showPayCta ? (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2 print:hidden">
                  <div className="font-medium">{inv.payment?.cta_label ?? "Pay online"}</div>
                  <p className="text-sm text-muted-foreground">{inv.payment?.cta_hint}</p>
                  <Button type="button" size="sm" className="rounded-lg" disabled>
                    Pay now (coming soon)
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">Totals</CardTitle>
              <CardDescription>VAT included where shown.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">{formatGBP(inv.subtotal_pence ?? null)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">VAT</span>
                <span className="tabular-nums">{formatGBP(inv.tax_pence ?? null)}</span>
              </div>
              <div className="flex justify-between gap-4 border-t pt-3 font-medium">
                <span>Invoice total</span>
                <span className="tabular-nums">{formatGBP(inv.total_pence ?? inv.total ?? null)}</span>
              </div>
              <div className="flex justify-between gap-4 border-t pt-3">
                <span className="text-muted-foreground">Amount due</span>
                <span className="tabular-nums font-semibold">
                  {formatGBP(inv.amount_due_pence ?? 0)}
                </span>
              </div>
            </CardContent>
          </Card>

          {inv.order?.id ? (
            <Card className="rounded-xl lg:col-span-3">
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-muted-foreground" aria-hidden />
                    Linked order
                  </CardTitle>
                  <CardDescription>Sharpening order this invoice is based on.</CardDescription>
                </div>
                <Button size="sm" variant="outline" className="rounded-lg shrink-0" asChild>
                  <Link href={`/account/orders/${inv.order.id}`}>View order</Link>
                </Button>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Reference</div>
                  <div className="font-medium">{inv.order.display_reference ?? "Your order"}</div>
                </div>
                {inv.order.status ? (
                  <div>
                    <div className="text-muted-foreground">Order status</div>
                    <div className="mt-1">
                      <CustomerOrderStatusBadge status={inv.order.status} />
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card className="rounded-xl lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">Line items</CardTitle>
              <CardDescription>Charges on this invoice.</CardDescription>
            </CardHeader>
            <CardContent>
              {!inv.items || inv.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No line items to display.</p>
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
                      {inv.items.map((row, idx) => (
                        <tr key={`${idx}-${row.description.slice(0, 32)}`} className="border-t">
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

          {inv.payments && inv.payments.length > 0 ? (
            <Card className="rounded-xl lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-muted-foreground" aria-hidden />
                  Payments recorded
                </CardTitle>
                <CardDescription>Payments we’ve applied to this invoice.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="divide-y rounded-lg border">
                  {inv.payments.map((p, idx) => (
                    <li key={idx} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-medium tabular-nums">{p.formatted_amount}</div>
                        {p.paid_at ? (
                          <div className="text-xs text-muted-foreground">
                            {new Date(p.paid_at).toLocaleString("en-GB")}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {p.method ? (
                          <span className="text-xs capitalize text-muted-foreground">{p.method.replace(/_/g, " ")}</span>
                        ) : null}
                        {p.status ? <StatusBadge kind="payment" status={p.status} /> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <div className="lg:col-span-3 print:hidden">
            <Link className="text-sm font-medium text-primary underline underline-offset-2" href="/account/invoices">
              Back to invoices
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
