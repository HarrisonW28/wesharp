"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Download, Loader2, Printer, Receipt } from "lucide-react";

import { AccountInvoiceDetailResponseSchema } from "@/lib/api/account-schema";
import { useAccountApi } from "@/lib/api/use-account-api";
import { CustomerOrderStatusBadge } from "@/components/orders/CustomerOrderStatusBadge";
import { humanizeUnderscored, invoiceStatusLabel } from "@/lib/helpers/status-helpers";

import { InvoiceDocument } from "@/components/invoices/InvoiceDocument";
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

  const docTitle = inv?.display_reference ?? "Invoice";
  const issuer = inv?.issuer ?? { legal_name: "WeSharp", address_lines: [] as string[] };
  const billTo = inv?.company
    ? {
        name: inv.company.name ?? inv.company_name ?? "—",
        city: inv.company.city,
        billing_email: inv.company.billing_email,
        phone: inv.company.phone,
      }
    : inv?.company_name
      ? { name: inv.company_name }
      : null;
  const paid = inv?.paid_pence ?? 0;
  const outstanding = inv?.outstanding_pence ?? inv?.amount_due_pence ?? 0;
  const showLineKinds = Boolean(
    inv?.items?.some((row) => row.line_item_type && row.line_item_type !== "one_off_service"),
  );

  return (
    <div className="space-y-8 print:space-y-6">
      <div className="print:hidden">
        <Breadcrumbs
          homeHref="/account/dashboard"
          items={[{ label: "Invoices", href: "/account/invoices" }, { label: "Invoice details" }]}
        />
        <PageHeader
          title={docTitle}
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
              <div className="flex flex-wrap gap-2">
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
                    <TooltipContent>Uses your browser&apos;s print dialog (save as PDF from there)</TooltipContent>
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
                        : "PDF download is not available yet — use Print to save a PDF from your browser."}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ) : null
          }
        />
      </div>

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
        <>
          {inv.customer_status_hint ? (
            <p className="print:hidden text-sm text-muted-foreground">{inv.customer_status_hint}</p>
          ) : null}

          <InvoiceDocument
            className="rounded-xl border bg-card p-5 shadow-sm md:p-8 print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none"
            documentTitle={docTitle}
            invoiceNumber={inv.invoice_number}
            issueDate={inv.issue_date}
            dueDate={inv.due_date}
            statusLabel={inv.customer_status_label ?? invoiceStatusLabel(inv.status ?? "")}
            paymentStatusLabel={inv.payment_status ? humanizeUnderscored(inv.payment_status) : undefined}
            issuer={issuer}
            billTo={billTo}
            lines={(inv.items ?? []).map((row) => ({
              description: row.description,
              quantity: row.quantity,
              unitFormatted: row.formatted_unit_amount,
              lineFormatted: row.formatted_line_total,
              kind: row.line_item_type,
            }))}
            showLineKinds={showLineKinds}
            subtotalPence={inv.subtotal_pence ?? 0}
            taxPence={inv.tax_pence ?? 0}
            totalPence={inv.total_pence ?? inv.total ?? 0}
            paidPence={paid}
            outstandingPence={outstanding}
            customerNotes={inv.customer_notes}
            defaultPaymentFooter={inv.default_payment_footer}
          />

          <div className="grid gap-4 print:hidden lg:grid-cols-3">
            {showPayCta ? (
              <Card className="rounded-xl lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-base">Payment</CardTitle>
                  <CardDescription>{inv.payment?.cta_hint}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="font-medium">{inv.payment?.cta_label ?? "Pay online"}</div>
                  <Button type="button" size="sm" className="rounded-lg" disabled>
                    Pay now (coming soon)
                  </Button>
                </CardContent>
              </Card>
            ) : null}

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

            <div className="lg:col-span-3">
              <Link className="text-sm font-medium text-primary underline underline-offset-2" href="/account/invoices">
                Back to invoices
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
