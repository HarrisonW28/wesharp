"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ClipboardList, Loader2 } from "lucide-react";

import { PaginatedTenantOrdersSchema } from "@/lib/api/account-schema";
import { useAccountApi } from "@/lib/api/use-account-api";
import { formatGBP } from "@/lib/format/money";

import { CustomerOrderStatusBadge } from "@/components/orders/CustomerOrderStatusBadge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
        description="Track sharpening work for your business — status, blades, and amounts in plain English."
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
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No orders yet"
          description="Once we’ve collected and logged your knives, orders and totals will appear here."
        />
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {rows.map((o) => (
              <Card key={o.id} className="overflow-hidden border shadow-sm">
                <CardContent className="p-0">
                  <Link
                    href={`/account/orders/${o.id}`}
                    className="flex items-start justify-between gap-3 p-4 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0 space-y-2">
                      <div className="font-medium leading-tight">
                        {o.display_reference ?? "Your order"}
                      </div>
                      <CustomerOrderStatusBadge status={o.status} />
                      {o.scheduled_date ? (
                        <p className="text-xs text-muted-foreground">
                          Collection day · {new Date(o.scheduled_date + "T12:00:00").toLocaleDateString("en-GB")}
                        </p>
                      ) : null}
                      <p className="text-sm tabular-nums text-muted-foreground">
                        Total {formatGBP(o.total_pence ?? null)}
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
                  <th className="px-4 py-2 text-left font-medium">Order</th>
                  <th className="px-4 py-2 text-left font-medium">Collection</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Total</th>
                  <th className="px-4 py-2 text-right font-medium">&nbsp;</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{o.display_reference ?? "Your order"}</div>
                      {o.updated_at ? (
                        <div className="text-xs text-muted-foreground">
                          Updated {new Date(o.updated_at).toLocaleDateString("en-GB")}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {o.scheduled_date
                        ? new Date(o.scheduled_date + "T12:00:00").toLocaleDateString("en-GB")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <CustomerOrderStatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">{formatGBP(o.total_pence ?? null)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link className="font-medium text-primary underline underline-offset-2" href={`/account/orders/${o.id}`}>
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
