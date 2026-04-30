"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Loader2, Receipt } from "lucide-react";

import { PaginatedTenantInvoicesSchema } from "@/lib/api/account-schema";
import { useAccountApi } from "@/lib/api/use-account-api";
import { formatGBP } from "@/lib/format/money";

import { CustomerInvoiceStatusBadge } from "@/components/invoices/CustomerInvoiceStatusBadge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status/StatusBadge";

export default function AccountInvoicesPage() {
  const api = useAccountApi();

  const listQuery = useQuery({
    queryKey: ["account-invoices"],
    queryFn: async () => {
      const res = await api.json<unknown>(`/api/account/invoices?per_page=50`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = PaginatedTenantInvoicesSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected invoices payload.");
      }
      return parsed.data.data.items;
    },
  });

  const rows = listQuery.data ?? [];

  return (
    <div className="space-y-8">
      <Breadcrumbs homeHref="/account/dashboard" items={[{ label: "Invoices" }]} />
      <PageHeader
        title="Invoices"
        description="Bills for your knife orders — what’s due, what’s paid, and line-by-line detail."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="rounded-lg" variant="outline" asChild>
              <Link href="/account/bookings/new">Book a collection</Link>
            </Button>
            <Button size="sm" className="rounded-lg" variant="outline" asChild>
              <Link href="/account/settings">Manage account</Link>
            </Button>
          </div>
        }
      />

      {listQuery.status === "pending" ? (
        <div className="flex min-h-[24vh] flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          <p className="text-sm">Loading invoices…</p>
        </div>
      ) : listQuery.isError ? (
        <EmptyState
          icon={Receipt}
          title="Could not load invoices"
          description={(listQuery.error as Error)?.message ?? "Please try again shortly."}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No invoices yet"
          description="When we bill you for sharpening, invoices will be listed here with amount and status."
        />
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {rows.map((inv) => (
              <Card key={inv.id} className="overflow-hidden border shadow-sm">
                <CardContent className="p-0">
                  <Link
                    href={`/account/invoices/${inv.id}`}
                    className="flex items-start justify-between gap-3 p-4 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0 space-y-2">
                      <div className="font-medium leading-tight">
                        {inv.display_reference ?? inv.invoice_number ?? "Invoice"}
                      </div>
                      <CustomerInvoiceStatusBadge status={inv.status} />
                      {inv.payment_status ? (
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <span>Payment</span>
                          <StatusBadge kind="payment" status={inv.payment_status} />
                        </div>
                      ) : null}
                      <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        {inv.issue_date ? <span>Issued {inv.issue_date}</span> : null}
                        {inv.due_date ? <span>Due {inv.due_date}</span> : null}
                      </div>
                      <p className="text-sm tabular-nums">
                        Total {formatGBP(inv.total_pence ?? inv.total ?? null)}
                        {inv.amount_due_pence != null && inv.amount_due_pence > 0 ? (
                          <span className="text-muted-foreground"> · Due {formatGBP(inv.amount_due_pence)}</span>
                        ) : null}
                      </p>
                    </div>
                    <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Invoice</th>
                  <th className="px-4 py-2 text-left font-medium">Issued</th>
                  <th className="px-4 py-2 text-left font-medium">Due</th>
                  <th className="px-4 py-2 text-right font-medium">Total</th>
                  <th className="px-4 py-2 text-right font-medium">Due now</th>
                  <th className="px-4 py-2 text-right font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">&nbsp;</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((inv) => (
                  <tr key={inv.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{inv.display_reference ?? inv.invoice_number ?? "—"}</div>
                      {inv.invoice_number &&
                      inv.display_reference &&
                      !inv.display_reference.includes(inv.invoice_number) ? (
                        <div className="text-xs text-muted-foreground tabular-nums">{inv.invoice_number}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{inv.issue_date ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{inv.due_date ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatGBP(inv.total_pence ?? inv.total ?? null)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {inv.amount_due_pence != null && inv.amount_due_pence > 0 ? formatGBP(inv.amount_due_pence) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <CustomerInvoiceStatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link className="font-medium text-primary underline underline-offset-2" href={`/account/invoices/${inv.id}`}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
