"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";

import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { InvoiceDetailResponseSchema } from "@/lib/api/admin-invoices-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { formatGBP } from "@/lib/format/money";
import { humanizeUnderscored, invoiceStatusLabel } from "@/lib/helpers/status-helpers";
import { InvoiceDocument } from "@/components/invoices/InvoiceDocument";

import { Button } from "@/components/ui/button";

export default function AdminInvoicePrintPage() {
  const params = useParams<{ invoiceId: string }>();
  const invoiceId = params.invoiceId;
  const admin = useAdminApi();

  const invQuery = useQuery({
    queryKey: ["admin-invoice-print", invoiceId],
    enabled: Boolean(invoiceId),
    queryFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/invoices/${invoiceId}`);
      if (!res.ok) throw new Error(res.message);
      const parsed = InvoiceDetailResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected invoice payload.");
      return parsed.data.data;
    },
  });

  useEffect(() => {
    if (invQuery.status === "success") {
      document.title = `Print · ${invQuery.data?.display_reference ?? "Invoice"}`;
    }
  }, [invQuery.data?.display_reference, invQuery.status]);

  if (invQuery.isPending) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (invQuery.isError || !invQuery.data) {
    return (
      <div className="p-8 text-sm text-destructive">{(invQuery.error as Error)?.message ?? "Could not load invoice."}</div>
    );
  }

  const inv = invQuery.data;
  const title = inv.display_reference ?? inv.invoice_number ?? "Invoice";
  const st = inv.status ?? "";
  const paid = inv.paid_pence ?? 0;
  const outstanding = inv.outstanding_pence ?? Math.max(0, (inv.total ?? 0) - paid);
  const issuer = inv.issuer ?? { legal_name: "WeSharp", address_lines: [] as string[] };
  const billTo = inv.company
    ? {
        name: inv.company.name ?? "—",
        city: inv.company.city,
        billing_email: inv.company.billing_email,
        phone: inv.company.phone,
      }
    : null;

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <div className="mx-auto max-w-4xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
        <div className="mb-6 print:hidden">
          <Button type="button" size="lg" onClick={() => globalThis.window?.print()}>
            Print / Save as PDF
          </Button>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            {/* PDF: server-generated PDFs are backlog — see docs/product/orders-invoices-payments.md */}
            Use your browser&apos;s print dialog to save as PDF. A dedicated PDF download is not available yet.
          </p>
        </div>

        <InvoiceDocument
          className="print:shadow-none"
          documentTitle={title}
          invoiceNumber={inv.invoice_number}
          issueDate={inv.issue_date}
          dueDate={inv.due_date}
          statusLabel={invoiceStatusLabel(st)}
          paymentStatusLabel={inv.payment_status ? humanizeUnderscored(inv.payment_status) : undefined}
          issuer={issuer}
          billTo={billTo}
          lines={(inv.items ?? []).map((line) => ({
            description: line.description,
            quantity: line.quantity,
            unitFormatted: line.unit_formatted ?? formatGBP(line.unit_amount),
            lineFormatted: line.line_formatted ?? formatGBP(line.line_total),
            kind: line.line_item_type ?? line.kind,
          }))}
          showLineKinds
          subtotalPence={inv.subtotal ?? 0}
          taxPence={inv.tax_total ?? 0}
          totalPence={inv.total ?? 0}
          paidPence={paid}
          outstandingPence={outstanding}
          customerNotes={inv.customer_notes}
          defaultPaymentFooter={inv.default_payment_footer}
          internalNotes={inv.internal_notes}
        />
      </div>
    </div>
  );
}
