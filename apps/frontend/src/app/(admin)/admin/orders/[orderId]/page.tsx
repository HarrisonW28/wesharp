"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { Copy, FileText, ListPlus, Loader2, Plus, PackagePlus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { OrderDetailResponseSchema, OrderInvoiceDraftResponseSchema } from "@/lib/api/admin-orders-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { formatGbpFromPence } from "@/lib/format/money";

import { KnifeLookup } from "@/components/admin/lookups/AsyncEntityLookup";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/status/StatusBadge";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type BulkLineRow = {
  key: string;
  knifeId: string | null;
  label: string;
  knifeType: string;
  brand: string;
  notes: string;
  quantity: number;
  unitPounds: string;
};

function makeEmptyBulkRow(): BulkLineRow {
  return {
    key: crypto.randomUUID(),
    knifeId: null,
    label: "",
    knifeType: "",
    brand: "",
    notes: "",
    quantity: 1,
    unitPounds: "5.00",
  };
}

function poundsInputToPence(s: string): number {
  const n = Number.parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
  return Math.round(n * 100);
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const admin = useAdminApi();
  const queryClient = useQueryClient();
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkCount, setBulkCount] = useState(5);
  const [bulkLinesOpen, setBulkLinesOpen] = useState(false);
  const [bulkLines, setBulkLines] = useState<BulkLineRow[]>([makeEmptyBulkRow()]);
  const [addOpen, setAddOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachKnifeId, setAttachKnifeId] = useState<string | null>(null);
  const [addKnifeType, setAddKnifeType] = useState("chefs");
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);

  const setBulkLine = (key: string, patch: Partial<BulkLineRow>) => {
    setBulkLines((rows) =>
      rows.map((r) => {
        if (r.key !== key) {
          return r;
        }
        const next = { ...r, ...patch };
        if (patch.knifeId !== undefined && patch.knifeId !== null) {
          next.quantity = 1;
        }
        return next;
      }),
    );
  };

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
      const res = await admin.json<unknown>(`/api/admin/orders/${orderId}/complete`, {
        method: "POST",
        body: JSON.stringify({}),
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
      setCompleteDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["admin-order", orderId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const invoiceDraftMutation = useMutation({
    mutationFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/orders/${orderId}/invoice-draft`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = OrderInvoiceDraftResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected invoice response.");
      }
      return parsed.data.data;
    },
    onSuccess: (data) => {
      const ref = data.invoice.invoice_number ?? data.invoice.id.slice(0, 8);
      toast.success(
        data.already_existed ? `Invoice already on file (${ref}).` : `Draft invoice ${ref} created.`,
      );
      void queryClient.invalidateQueries({ queryKey: ["admin-order", orderId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const attachMutation = useMutation({
    mutationFn: async (knifeId: string) => {
      const res = await admin.json(`/api/admin/orders/${orderId}/attach-knife`, {
        method: "POST",
        body: JSON.stringify({ knife_id: knifeId }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: () => {
      toast.success("Existing knife attached to this order.");
      setAttachOpen(false);
      setAttachKnifeId(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-order", orderId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-knives"] });
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

  const bulkLinesMutation = useMutation({
    mutationFn: async () => {
      const items: Record<string, unknown>[] = [];
      for (const row of bulkLines) {
        const unit_amount_pence = poundsInputToPence(row.unitPounds);
        if (row.knifeId) {
          items.push({
            knife_id: row.knifeId,
            quantity: row.quantity,
            unit_amount_pence,
            notes: row.notes.trim() || undefined,
          });
          continue;
        }
        if (!row.label.trim() && !row.knifeType.trim()) {
          continue;
        }
        items.push({
          knife_type: row.knifeType.trim() || undefined,
          label: row.label.trim() || undefined,
          brand: row.brand.trim() || undefined,
          notes: row.notes.trim() || undefined,
          quantity: row.quantity,
          unit_amount_pence,
        });
      }
      if (items.length === 0) {
        throw new Error("Add at least one row with an existing knife or a new name/type.");
      }
      const res = await admin.json<unknown>(`/api/admin/orders/${orderId}/bulk-order-items`, {
        method: "POST",
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = OrderDetailResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected order response.");
      }
      return parsed.data.data;
    },
    onSuccess: () => {
      toast.success("Order lines added.");
      setBulkLinesOpen(false);
      setBulkLines([makeEmptyBulkRow()]);
      void queryClient.invalidateQueries({ queryKey: ["admin-order", orderId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-knives"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
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
  const hasBillableLines = (o.items?.length ?? 0) > 0;
  const hasWorkForComplete = (o.items?.length ?? 0) > 0 || (o.knives?.length ?? 0) > 0;
  const isCompleted = o.status === "completed";

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
        description={`Booking ${o.scheduled_date ?? "—"} · Payment ${o.payment_status ?? "—"}`}
      />

      <AlertDialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete this order?</AlertDialogTitle>
            <AlertDialogDescription>
              This marks the order as completed and records the completion time. Generate an invoice draft as a separate
              step when you are ready — drafts are never sent automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <Button type="button" disabled={completeMutation.isPending} onClick={() => completeMutation.mutate()}>
              {completeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Confirm complete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4 md:col-span-2">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Overview</div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge kind="order" status={o.status ?? ""} />
            <span className="text-xs text-muted-foreground">Order status</span>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Company</dt>
              <dd className="font-semibold">
                {o.company?.name ?? "—"}
                {o.company?.city ? (
                  <span className="font-normal text-muted-foreground"> · {o.company.city}</span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Route</dt>
              <dd className="font-semibold">{o.route_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Booking</dt>
              <dd>
                {o.booking_id ? (
                  <Link className="font-medium text-primary underline" href={`/admin/bookings/${o.booking_id}`}>
                    Open booking
                  </Link>
                ) : (
                  <span className="font-semibold">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Completed</dt>
              <dd className="font-semibold">
                {o.completed_at ? new Date(o.completed_at).toLocaleString("en-GB") : "—"}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="flex flex-col gap-3 p-4">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Invoice</div>
          {o.invoice ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
                <span className="font-mono text-sm">{o.invoice.invoice_number ?? o.invoice.id.slice(0, 8)}</span>
                <StatusBadge kind="invoice" status={o.invoice.status ?? ""} />
              </div>
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Subtotal (ex VAT)</dt>
                  <dd className="font-medium tabular-nums">{formatGbpFromPence(o.invoice.subtotal_pence)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">VAT</dt>
                  <dd className="font-medium tabular-nums">{formatGbpFromPence(o.invoice.tax_pence)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Total</dt>
                  <dd className="font-semibold tabular-nums">{formatGbpFromPence(o.invoice.total_pence)}</dd>
                </div>
              </dl>
              <Button asChild variant="secondary" className="w-full">
                <Link href={`/admin/invoices/${o.invoice.id}`}>Open invoice</Link>
              </Button>
            </>
          ) : isCompleted ? (
            <>
              <p className="text-sm text-muted-foreground">No invoice yet. Generate a draft from this order (not sent).</p>
              <Button
                type="button"
                className="w-full gap-2"
                disabled={invoiceDraftMutation.isPending}
                onClick={() => invoiceDraftMutation.mutate()}
              >
                {invoiceDraftMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Generate invoice draft
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Complete the order to create an invoice draft.</p>
          )}
        </Card>

        <Card className="p-4 md:col-span-2">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Commercials</div>
          {hasBillableLines ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Totals follow <strong className="font-medium text-foreground">billable lines</strong> below. Price-per-knife
              applies only when there are no lines.
            </p>
          ) : null}
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
          <div className="text-xs font-semibold uppercase text-muted-foreground">Manifest actions</div>
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

          <Dialog
            open={bulkLinesOpen}
            onOpenChange={(open) => {
              setBulkLinesOpen(open);
              if (open) {
                setBulkLines([makeEmptyBulkRow()]);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2" variant="secondary" type="button">
                <ListPlus className="h-4 w-4" aria-hidden />
                Bulk lines (priced)
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add multiple billable lines</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Each row is one workshop line: pick an existing unassigned knife (quantity locked to 1) or enter a new
                name/type (quantity creates that many blades and lines). Unit price is ex-VAT (GBP).
              </p>
              <div className="space-y-4">
                {bulkLines.map((row, idx) => (
                  <div key={row.key} className="rounded-lg border border-border p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Row {idx + 1}</span>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() =>
                            setBulkLines((r) => {
                              const i = r.findIndex((x) => x.key === row.key);
                              const clone: BulkLineRow = {
                                ...row,
                                key: crypto.randomUUID(),
                                knifeId: null,
                              };
                              const next = [...r];
                              next.splice(i + 1, 0, clone);
                              return next;
                            })
                          }
                        >
                          <Copy className="h-4 w-4" aria-hidden />
                          <span className="sr-only">Duplicate row</span>
                        </Button>
                        {bulkLines.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-destructive"
                            onClick={() => setBulkLines((r) => r.filter((x) => x.key !== row.key))}
                          >
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    <KnifeLookup
                      label="Existing knife (optional)"
                      value={row.knifeId}
                      onChange={(id) => setBulkLine(row.key, { knifeId: id })}
                      disabled={!o.company_id}
                      nullable
                      extraParams={
                        o.company_id ? { company_id: o.company_id, unassigned_only: true } : undefined
                      }
                      placeholder="Search, or leave blank for new blades…"
                    />
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div>
                        <Label>New label / name</Label>
                        <Input
                          value={row.label}
                          onChange={(e) => setBulkLine(row.key, { label: e.target.value, knifeId: null })}
                          disabled={!!row.knifeId}
                          placeholder="e.g. Primary chef"
                        />
                      </div>
                      <div>
                        <Label>Type</Label>
                        <Input
                          value={row.knifeType}
                          onChange={(e) => setBulkLine(row.key, { knifeType: e.target.value, knifeId: null })}
                          disabled={!!row.knifeId}
                          placeholder="e.g. chefs"
                        />
                      </div>
                      <div>
                        <Label>Brand (new only)</Label>
                        <Input
                          value={row.brand}
                          onChange={(e) => setBulkLine(row.key, { brand: e.target.value })}
                          disabled={!!row.knifeId}
                        />
                      </div>
                      <div>
                        <Label>Qty</Label>
                        <Input
                          inputMode="numeric"
                          type="number"
                          min={1}
                          max={500}
                          value={row.quantity}
                          onChange={(e) =>
                            setBulkLine(row.key, { quantity: Number.parseInt(e.target.value, 10) || 1 })
                          }
                          disabled={!!row.knifeId}
                        />
                      </div>
                      <div>
                        <Label>Unit £ (ex VAT)</Label>
                        <Input
                          inputMode="decimal"
                          value={row.unitPounds}
                          onChange={(e) => setBulkLine(row.key, { unitPounds: e.target.value })}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Line notes</Label>
                        <Input value={row.notes} onChange={(e) => setBulkLine(row.key, { notes: e.target.value })} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setBulkLines((r) => [...r, makeEmptyBulkRow()])}
              >
                + Add another row
              </Button>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setBulkLinesOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" disabled={bulkLinesMutation.isPending} onClick={() => bulkLinesMutation.mutate()}>
                  {bulkLinesMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                  Submit lines
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
                <p className="text-xs text-muted-foreground">Quick register without per-line pricing (uses price/knife if set).</p>
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

          <Dialog open={attachOpen} onOpenChange={setAttachOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" variant="outline" type="button">
                Attach existing knife
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Link inventory knife</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Search unassigned blades already on file for {o.company?.name ?? "this customer"} (not on another
                order). Audit history is preserved; this only sets the current order on the blade.
              </p>
              <KnifeLookup
                label="Knife"
                value={attachKnifeId}
                onChange={setAttachKnifeId}
                disabled={!o.company_id}
                extraParams={
                  o.company_id
                    ? { company_id: o.company_id, unassigned_only: true }
                    : undefined
                }
                placeholder="Search by tag, type, or label…"
              />
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setAttachOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={attachMutation.isPending || !attachKnifeId}
                  onClick={() => attachKnifeId && !attachMutation.isPending && attachMutation.mutate(attachKnifeId)}
                >
                  {attachMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                  Attach to order
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            type="button"
            variant="secondary"
            disabled={completeMutation.isPending || o.status === "completed" || !hasWorkForComplete}
            onClick={() => setCompleteDialogOpen(true)}
          >
            {completeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
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

      <div className="text-sm font-semibold">Billable lines</div>
      {(o.items ?? []).length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          No priced lines yet — use <strong className="font-medium text-foreground">Bulk lines (priced)</strong> to add
          blades with unit rates (and optional inventory link per row).
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {(o.items ?? []).map((line) => (
            <li key={line.id} className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
              <div className="font-medium">{line.description}</div>
              <div className="text-xs text-muted-foreground">
                {line.quantity} × {formatGbpFromPence(line.unit_amount_pence)} ex VAT
                {line.knife_id ? (
                  <>
                    {" "}
                    ·{" "}
                    <Link className="text-primary underline" href={`/admin/knives/${line.knife_id}`}>
                      Knife
                    </Link>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

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
                <div className="font-semibold">{("label" in k && typeof k.label === "string" && k.label) || k.knife_type || "Blade"}</div>
              </div>
              <StatusBadge kind="knife" status={k.status ?? ""} />
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
