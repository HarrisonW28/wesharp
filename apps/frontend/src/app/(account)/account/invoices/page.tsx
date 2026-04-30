"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { PaginatedTenantInvoicesSchema } from "@/lib/api/account-schema";
import { useAccountApi } from "@/lib/api/use-account-api";
import { formatGbpFromPence } from "@/lib/format/money";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
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
      <PageHeader title="Invoices" description="Download links and Stripe sync will appear here as finance enables them." />

      {listQuery.status === "pending" ? (
        <div className="flex min-h-[20vh] items-center justify-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        </div>
      ) : listQuery.isError ? (
        <p className="text-sm text-destructive">{(listQuery.error as Error).message}</p>
      ) : (
        <div className="overflow-hidden rounded-md border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Number</th>
                <th className="px-4 py-2 text-left font-medium">Issued</th>
                <th className="px-4 py-2 text-left font-medium">Due</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
                <th className="px-4 py-2 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((inv) => (
                <tr key={inv.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{inv.invoice_number ?? inv.id.slice(0, 8)}</td>
                  <td className="px-4 py-3">{inv.issue_date ?? "—"}</td>
                  <td className="px-4 py-3">{inv.due_date ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatGbpFromPence(inv.total ?? null)}</td>
                  <td className="px-4 py-3 text-right">
                    <StatusBadge kind="invoice" status={inv.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No invoices on file yet.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
