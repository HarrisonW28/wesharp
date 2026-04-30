"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Receipt } from "lucide-react";

import { PaginatedTenantInvoicesSchema } from "@/lib/api/account-schema";
import { useAccountApi } from "@/lib/api/use-account-api";
import { formatGBP } from "@/lib/format/money";

import { EmptyState } from "@/components/feedback/EmptyState";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Button } from "@/components/ui/button";

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
        description="Bills for your knife orders. Questions about a total? Contact us from your booking or settings."
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
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Invoice</th>
                <th className="px-4 py-2 text-left font-medium">Issued</th>
                <th className="px-4 py-2 text-left font-medium">Due</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
                <th className="px-4 py-2 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((inv) => (
                <tr key={inv.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium tabular-nums">{inv.invoice_number ?? "—"}</td>
                  <td className="px-4 py-3">{inv.issue_date ?? "—"}</td>
                  <td className="px-4 py-3">{inv.due_date ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatGBP(inv.total ?? null)}</td>
                  <td className="px-4 py-3 text-right">
                    <StatusBadge kind="invoice" status={inv.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
