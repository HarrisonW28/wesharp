"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { OrderDetailResponseSchema } from "@/lib/api/admin-orders-schema";
import { useAccountApi } from "@/lib/api/use-account-api";
import { formatGBP } from "@/lib/format/money";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/status/StatusBadge";
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
        items={[{ label: "My orders", href: "/account/orders" }, { label: "Order details" }]}
      />
      <PageHeader
        title="Order details"
        description="Totals shown here match what we will invoice — read-only while we process your knives."
      />

      {orderQuery.status === "pending" ? (
        <div className="flex min-h-[24vh] flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          <p className="text-sm">Loading order…</p>
        </div>
      ) : orderQuery.isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="text-destructive">{(orderQuery.error as Error).message}</p>
        </div>
      ) : o ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-xl lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Charges</CardTitle>
              <CardDescription>We update these figures as your order moves through sharpening.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm md:grid-cols-2">
              <div className="text-muted-foreground">Status</div>
              <div>
                <StatusBadge kind="order" status={o.status} />
              </div>
              <div className="text-muted-foreground">Total</div>
              <div>{formatGBP(o.total_pence ?? null)}</div>
              <div className="text-muted-foreground">Payment</div>
              <div>
                <StatusBadge kind="payment" status={o.payment_status} />
              </div>
              <div className="text-muted-foreground">Knives</div>
              <div>{String(o.knife_count ?? "—")}</div>
              <div className="text-muted-foreground">Scheduled day</div>
              <div>{o.scheduled_date ?? "—"}</div>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">Blades</CardTitle>
              <CardDescription>Each knife we logged for this order.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {!o.knives || o.knives.length === 0 ? (
                <p className="text-muted-foreground">Blade list will appear once your knives are registered on this order.</p>
              ) : (
                <ul className="space-y-2">
                  {o.knives.map((k) => (
                    <li key={k.id} className="flex justify-between gap-4 border-b border-dashed pb-2">
                      <span>{k.tag_id ?? k.id}</span>
                      <StatusBadge kind="knife" status={k.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-3">
            <Link className="text-sm font-medium text-primary underline underline-offset-2" href="/account/orders">
              Back to my orders
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
