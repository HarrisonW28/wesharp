"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";

import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { InvoiceDetailResponseSchema } from "@/lib/api/admin-invoices-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { formatGBP } from "@/lib/format/money";

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

  return (
    <div className="min-h-screen bg-white p-8 text-black print:p-6">
      <div className="mx-auto max-w-3xl print:max-w-none">
        <div className="mb-8 flex items-start justify-between gap-4 print:hidden">
          <Button type="button" size="lg" onClick={() => window.print()}>
            Print / Save as PDF
          </Button>
        </div>

        <header className="border-b pb-6">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {inv.company?.name}
            {inv.company?.city ? ` · ${inv.company.city}` : ""}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div>
              <div className="text-neutral-500">Status</div>
              <div className="font-medium capitalize">{inv.status}</div>
            </div>
            <div>
              <div className="text-neutral-500">Issue</div>
              <div className="font-medium">{inv.issue_date ?? "—"}</div>
            </div>
            <div>
              <div className="text-neutral-500">Due</div>
              <div className="font-medium">{inv.due_date ?? "—"}</div>
            </div>
            <div>
              <div className="text-neutral-500">Total</div>
              <div className="font-bold tabular-nums">{formatGBP(inv.total ?? 0)}</div>
            </div>
          </div>
        </header>

        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Lines</h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-neutral-500">
                <th className="py-2 pr-2">Description</th>
                <th className="py-2 pr-2">Qty</th>
                <th className="py-2 pr-2">Unit</th>
                <th className="py-2 text-right">Line</th>
              </tr>
            </thead>
            <tbody>
              {(inv.items ?? []).map((line) => (
                <tr key={line.id} className="border-b border-neutral-200">
                  <td className="py-2 pr-2">{line.description}</td>
                  <td className="py-2 pr-2 tabular-nums">{line.quantity}</td>
                  <td className="py-2 pr-2 tabular-nums">{line.unit_formatted ?? formatGBP(line.unit_amount)}</td>
                  <td className="py-2 text-right tabular-nums font-medium">
                    {line.line_formatted ?? formatGBP(line.line_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-10 flex justify-end">
          <dl className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-600">Subtotal</dt>
              <dd className="tabular-nums">{formatGBP(inv.subtotal ?? 0)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-600">VAT</dt>
              <dd className="tabular-nums">{formatGBP(inv.tax_total ?? 0)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t pt-2 text-base font-bold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatGBP(inv.total ?? 0)}</dd>
            </div>
            <div className="flex justify-between gap-4 text-neutral-600">
              <dt>Paid</dt>
              <dd className="tabular-nums">{inv.formatted_paid ?? formatGBP(inv.paid_pence ?? 0)}</dd>
            </div>
            <div className="flex justify-between gap-4 font-semibold">
              <dt>Outstanding</dt>
              <dd className="tabular-nums">{inv.formatted_outstanding ?? formatGBP(inv.outstanding_pence ?? 0)}</dd>
            </div>
          </dl>
        </section>

        <footer className="mt-16 border-t pt-6 text-center text-xs text-neutral-500">
          WeSharp · Internal print view · Not a tax invoice until issued per your process
        </footer>
      </div>
    </div>
  );
}
