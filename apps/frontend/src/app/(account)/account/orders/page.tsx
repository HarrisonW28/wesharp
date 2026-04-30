"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Loader2 } from "lucide-react";

import { PaginatedTenantOrdersSchema } from "@/lib/api/account-schema";
import { useAccountApi } from "@/lib/api/use-account-api";
import { formatGBP } from "@/lib/format/money";

import { EmptyState } from "@/components/feedback/EmptyState";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Button } from "@/components/ui/button";

export default function AccountOrdersPage() {
  const api = useAccountApi();

  const listQuery = useQuery({
    queryKey: ["account-orders"],
    queryFn: async () => {
      const res = await api.json<unknown>(`/api/account/orders?per_page=50`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = PaginatedTenantOrdersSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected orders payload.");
      }
      return parsed.data.data.items;
    },
  });

  const rows = listQuery.data ?? [];

  return (
    <div className="space-y-8">
      <Breadcrumbs homeHref="/account/dashboard" items={[{ label: "My orders" }]} />
      <PageHeader
        title="My orders"
        description="Knife sharpening orders and charges for your business."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="rounded-lg" asChild>
              <Link href="/account/bookings/new">Book a collection</Link>
            </Button>
            <Button size="sm" variant="outline" className="rounded-lg" asChild>
              <Link href="/pricing">View pricing</Link>
            </Button>
          </div>
        }
      />

      {listQuery.status === "pending" ? (
        <div className="flex min-h-[20vh] items-center justify-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        </div>
      ) : listQuery.isError ? (
        <EmptyState
          icon={ClipboardList}
          title="Could not load orders"
          description={(listQuery.error as Error)?.message ?? "Please try again."}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Updated</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
                <th className="px-4 py-2 text-right font-medium">&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3">
                    {o.updated_at ? new Date(o.updated_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge kind="order" status={o.status} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatGBP(o.total_pence ?? null)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link className="font-medium text-primary underline underline-offset-2" href={`/account/orders/${o.id}`}>
                      View order
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <div className="border-t px-4 py-10">
              <EmptyState
                icon={ClipboardList}
                title="No orders yet"
                description="Once we’ve collected and logged your knives, orders and totals will appear here."
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
