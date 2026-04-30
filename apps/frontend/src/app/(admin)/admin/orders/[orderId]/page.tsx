"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { Loader2, Plus, PackagePlus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { OrderDetailResponseSchema } from "@/lib/api/admin-orders-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { formatGbpFromPence } from "@/lib/format/money";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function AdminOrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const admin = useAdminApi();
  const queryClient = useQueryClient();
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkCount, setBulkCount] = useState(5);
  const [addOpen, setAddOpen] = useState(false);
  const [addKnifeType, setAddKnifeType] = useState("chefs");

  const orderQuery = useQuery({
    queryKey: ["admin-order", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/orders/${orderId}`);
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

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await admin.json(`/api/admin/orders/${orderId}/complete`, {
        method: "POST",
        body: "{}",
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = OrderDetailResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Bad response.");
      }
      return parsed.data.data;
    },
    onSuccess: () => {
      toast.success("Order completed.");
      void queryClient.invalidateQueries({ queryKey: ["admin-order", orderId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkMutation = useMutation({
    mutationFn: async () => {
      const res = await admin.json(`/api/admin/orders/${orderId}/bulk-add-knives`, {
        method: "POST",
        body: JSON.stringify({ count: bulkCount, description_prefix: "Blade" }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: () => {
      toast.success("Knives registered.");
      void queryClient.invalidateQueries({ queryKey: ["admin-order", orderId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-knives"] });
      setBulkOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addKnifeMutation = useMutation({
    mutationFn: async () => {
      const res = await admin.json(`/api/admin/orders/${orderId}/add-knife`, {
        method: "POST",
        body: JSON.stringify({ knife_type: addKnifeType || undefined }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: () => {
      toast.success("Knife added.");
      setAddOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["admin-order", orderId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-knives"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (orderQuery.isPending) {
    return (
      <>
        <Breadcrumbs crumbs={[{ label: "Orders", href: "/admin/orders" }, { label: "…" }]} />
        <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        </div>
      </>
    );
  }

  if (orderQuery.isError) {
    return (
      <>
        <Breadcrumbs crumbs={[{ label: "Orders", href: "/admin/orders" }, { label: "Error" }]} />
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          <p className="font-medium text-destructive">{(orderQuery.error as Error).message}</p>
          <Button className="mt-3" type="button" variant="outline" size="sm" onClick={() => void orderQuery.refetch()}>
            Retry
          </Button>
        </div>
      </>
    );
  }

  if (!orderQuery.data) {
    return (
      <>
        <Breadcrumbs crumbs={[{ label: "Orders", href: "/admin/orders" }, { label: "Not found" }]} />
        <p className="text-sm text-muted-foreground">Order could not be loaded.</p>
      </>
    );
  }

  const o = orderQuery.data;

  return (
    <>
      <Breadcrumbs
        crumbs={[
          { label: "Orders", href: "/admin/orders" },
          { label: `Order ${orderId.slice(0, 8)}…` },
        ]}
      />
      <PageHeader
        title={`Order · ${o.company?.name ?? "Account"}`}
        description={`${o.status ?? ""} · Payment ${o.payment_status ?? "—"}`}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4 md:col-span-2">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Commercials</div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Knives (rows)</dt>
              <dd className="font-semibold">{o.knife_count ?? 0}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Price / knife</dt>
              <dd className="font-semibold">{formatGbpFromPence(o.price_per_knife_pence ?? 0)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Discount</dt>
              <dd className="font-semibold">{formatGbpFromPence(o.discount_pence ?? 0)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-semibold">{formatGbpFromPence(o.subtotal_pence ?? 0)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">VAT</dt>
              <dd className="font-semibold">{formatGbpFromPence(o.tax_pence ?? 0)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total</dt>
              <dd className="font-semibold">{formatGbpFromPence(o.total_pence ?? 0)}</dd>
            </div>
          </dl>
        </Card>

        <Card className="flex flex-col gap-3 p-4">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" variant="outline" type="button">
                <Plus className="h-4 w-4" aria-hidden />
                Add one knife
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register a single blade</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="kt">Knife type</Label>
                <Input id="kt" value={addKnifeType} onChange={(e) => setAddKnifeType(e.target.value)} placeholder="e.g. chefs" />
                <p className="text-xs text-muted-foreground">A unique tag_id is allocated automatically.</p>
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" disabled={addKnifeMutation.isPending} onClick={() => addKnifeMutation.mutate()}>
                  {addKnifeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                  Add knife
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" type="button">
                <PackagePlus className="h-4 w-4" aria-hidden />
                Bulk add knives
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk register blades</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="count">How many?</Label>
                <Input
                  id="count"
                  inputMode="numeric"
                  value={bulkCount}
                  onChange={(e) => setBulkCount(Number.parseInt(e.target.value, 10) || 1)}
                  min={1}
                  max={500}
                  type="number"
                />
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setBulkOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" disabled={bulkMutation.isPending} onClick={() => bulkMutation.mutate()}>
                  {bulkMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                  Generate
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            type="button"
            variant="secondary"
            disabled={completeMutation.isPending || o.status === "completed"}
            onClick={() => completeMutation.mutate()}
          >
            Complete order
          </Button>

          <p className="text-xs text-muted-foreground">
            Tag IDs are generated server-side. Knife workflow continues on{" "}
            <Link href="/admin/knives" className="text-primary underline">
              Knives
            </Link>
            .
          </p>
        </Card>
      </div>

      <Separator className="my-6" />

      <div className="text-sm font-semibold">Knives on this order</div>
      {(o.knives ?? []).length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No blades registered yet — use bulk or single add above.</p>
      ) : null}
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {(o.knives ?? []).map((k) => (
          <Card key={k.id} className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-mono text-xs text-muted-foreground">{k.tag_id}</div>
                <div className="font-semibold">{k.knife_type ?? "Blade"}</div>
              </div>
              <Badge>{(k.status ?? "").replace(/_/g, " ")}</Badge>
            </div>
            <Button asChild variant="link" className="mt-2 h-auto px-0">
              <Link href={`/admin/knives/${k.id}`}>Open lifecycle</Link>
            </Button>
          </Card>
        ))}
      </div>
    </>
  );
}
