"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { OrderDetailResponseSchema } from "@/lib/api/admin-orders-schema";
import { useAccountApi } from "@/lib/api/use-account-api";
import { formatGbpFromPence } from "@/lib/format/money";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
      const parsed = OrderDetailResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected order payload.");
      }
      return parsed.data.data;
    },
  });

  const o = orderQuery.data;

  return (
    <div className="space-y-8">
      <Breadcrumbs
        homeHref="/account/dashboard"
        items={[{ label: "Orders", href: "/account/orders" }, { label: orderId ?? "…" }]}
      />
      <PageHeader
        title={o ? `Order ${orderId?.slice(0, 8)}…` : "Order"}
        description="Read-only totals — invoicing mirrors what finance posted for this fulfilment."
      />

      {orderQuery.status === "pending" ? (
        <div className="flex min-h-[20vh] items-center justify-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        </div>
      ) : orderQuery.isError ? (
        <p className="text-sm text-destructive">{(orderQuery.error as Error).message}</p>
      ) : o ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Charges</CardTitle>
              <CardDescription>These fields are maintained by fulfilment tooling.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm md:grid-cols-2">
              <div className="text-muted-foreground">Status</div>
              <div>
                <Badge>{o.status ?? "—"}</Badge>
              </div>
              <div className="text-muted-foreground">Total</div>
              <div>{formatGbpFromPence(o.total_pence ?? null)}</div>
              <div className="text-muted-foreground">Payment</div>
              <div>{o.payment_status ?? "—"}</div>
              <div className="text-muted-foreground">Knives</div>
              <div>{String(o.knife_count ?? "—")}</div>
              <div className="text-muted-foreground">Scheduled day</div>
              <div>{o.scheduled_date ?? "—"}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Blades</CardTitle>
              <CardDescription>Latest shop statuses flow here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {!o.knives || o.knives.length === 0 ? (
                <p className="text-muted-foreground">No knives surfaced yet.</p>
              ) : (
                <ul className="space-y-2">
                  {o.knives.map((k) => (
                    <li key={k.id} className="flex justify-between gap-4 border-b border-dashed pb-2">
                      <span>{k.tag_id ?? k.id}</span>
                      <Badge variant="outline">{k.status ?? "?"}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-3">
            <Link className="text-sm text-primary underline" href="/account/orders">
              Back to history
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
