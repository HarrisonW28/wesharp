"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

import { Copy, FileText, ListPlus, Loader2, Plus, PackagePlus, Pencil } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { OrderDetailResponseSchema, OrderInvoiceDraftResponseSchema } from "@/lib/api/admin-orders-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { coerceGbpInputToMinorUnits, formatGBP, parseGbpInputToMinorUnits } from "@/lib/format/money";
import { KNIFE_TYPE_OPTIONS } from "@/lib/knife-catalog";
import { useBackendMe } from "@/hooks/use-backend-me";

import { AuditTimeline, type AuditTimelineRow } from "@/components/admin/AuditTimeline";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

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

const PAYMENT_OPTIONS = [
  { value: "unpaid", label: "Unpaid" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "waived", label: "Waived" },
  { value: "refunded", label: "Refunded" },
];

const BULK_CONFIRM_THRESHOLD = 25;

export default function AdminOrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const admin = useAdminApi();
  const queryClient = useQueryClient();
  const { data: mePayload } = useBackendMe();
  const permissions = useMemo(() => new Set(mePayload?.data?.permissions ?? []), [mePayload?.data?.permissions]);
  const canKnives = permissions.has("knives.update");
  const canOrders = permissions.has("orders.update");
  const canInvoice = permissions.has("invoices.create");

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkCount, setBulkCount] = useState(5);
  const [bulkKnifeConfirmOpen, setBulkKnifeConfirmOpen] = useState(false);
  const [bulkLinesOpen, setBulkLinesOpen] = useState(false);
  const [bulkLines, setBulkLines] = useState<BulkLineRow[]>([makeEmptyBulkRow()]);
  const [addOpen, setAddOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachKnifeId, setAttachKnifeId] = useState<string | null>(null);
  const [addKnifeType, setAddKnifeType] = useState("chefs");
  const [addLabel, setAddLabel] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addCondition, setAddCondition] = useState("");
  const [addDamageNotes, setAddDamageNotes] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editDiscountGbp, setEditDiscountGbp] = useState("");
  const [editPppGbp, setEditPppGbp] = useState("");
  const [editPayment, setEditPayment] = useState("unpaid");

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

  const syncEditForm = (order: NonNullable<typeof orderQuery.data>) => {
    const d = order.discount_pence ?? 0;
    setEditDiscountGbp(d === 0 ? "" : (d / 100).toFixed(2));
    const p = order.price_per_knife_pence;
    setEditPppGbp(p == null || p === 0 ? "" : (p / 100).toFixed(2));
    setEditPayment(order.payment_status ?? "unpaid");
  };

  const transitionMutation = useMutation({
    mutationFn: async (body: { target_status: string; reason?: string }) => {
      const res = await admin.json<unknown>(`/api/admin/orders/${orderId}/transition`, {
        method: "POST",
        body: JSON.stringify(body),
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
    onSuccess: (_, vars) => {
      toast.success(vars.target_status === "active" ? "Order marked active." : "Order cancelled.");
      setCancelDialogOpen(false);
      setCancelReason("");
      void queryClient.invalidateQueries({ queryKey: ["admin-order", orderId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateOrderMutation = useMutation({
    mutationFn: async () => {
      let discountPence = 0;
      let ppp: number | null = null;
      try {
        if (editDiscountGbp.trim() !== "") {
          discountPence = parseGbpInputToMinorUnits(editDiscountGbp) ?? 0;
        }
        if (editPppGbp.trim() !== "") {
          ppp = parseGbpInputToMinorUnits(editPppGbp) ?? null;
        }
      } catch (e) {
        throw new Error(e instanceof Error ? e.message : "Invalid money input.");
      }
      const body: Record<string, unknown> = {
        payment_status: editPayment,
        discount_pence: discountPence,
      };
      if (ppp !== null) {
        body.price_per_knife_pence = ppp;
      }
      const res = await admin.json<unknown>(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        body: JSON.stringify(body),
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
      toast.success("Order updated.");
      setEditOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["admin-order", orderId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
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

  const requestBulkKnives = () => {
    if (bulkCount > BULK_CONFIRM_THRESHOLD) {
      setBulkKnifeConfirmOpen(true);
      return;
    }
    bulkMutation.mutate();
  };

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
      setBulkKnifeConfirmOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkLinesMutation = useMutation({
    mutationFn: async () => {
      const items: Record<string, unknown>[] = [];
      let totalQty = 0;
      for (const row of bulkLines) {
        const unit_amount_pence = coerceGbpInputToMinorUnits(row.unitPounds);
        if (row.knifeId) {
          items.push({
            knife_id: row.knifeId,
            quantity: row.quantity,
            unit_amount_pence,
            notes: row.notes.trim() || undefined,
          });
          totalQty += row.quantity;
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
        totalQty += row.quantity;
      }
      if (items.length === 0) {
        throw new Error("Add at least one row with an existing knife or a new name/type.");
      }
      if (totalQty > BULK_CONFIRM_THRESHOLD) {
        const ok = window.confirm(
          `You are adding ${totalQty} billable units across ${items.length} row(s). Continue?`,
        );
        if (!ok) {
          throw new Error("Cancelled.");
        }
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
    onError: (e: Error) => {
      if (e.message !== "Cancelled.") {
        toast.error(e.message);
      }
    },
  });

  const addKnifeMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        knife_type: addKnifeType || undefined,
        label: addLabel.trim() || undefined,
        description: addDescription.trim() || undefined,
        condition_before: addCondition.trim() || undefined,
        damage_notes: addDamageNotes.trim() || undefined,
        notes: addNotes.trim() || undefined,
      };
      const res = await admin.json(`/api/admin/orders/${orderId}/add-knife`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: () => {
      toast.success("Knife added.");
      setAddOpen(false);
      setAddLabel("");
      setAddDescription("");
      setAddCondition("");
      setAddDamageNotes("");
      setAddNotes("");
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
          <Button className="mt-3" type="button" variant="outline" size="default" onClick={() => void orderQuery.refetch()}>
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
  const orderRef = o.reference ?? `Order`;
  const hasBillableLines = (o.items?.length ?? 0) > 0;
  const hasWorkForComplete = (o.items?.length ?? 0) > 0 || (o.knives?.length ?? 0) > 0;
  const isCompleted = o.status === "completed";
  const isCancelled = o.status === "cancelled";
  const isDraft = o.status === "draft";
  const bd = o.booking_detail;

  const completeWarnings: string[] = [];
  if (!hasBillableLines && (o.knives?.length ?? 0) > 0) {
    completeWarnings.push("There are no priced billable lines — totals may rely on price-per-knife until lines are added.");
  }
  if (!hasBillableLines && (o.price_per_knife_pence == null || o.price_per_knife_pence === 0)) {
    completeWarnings.push("Set a price per knife or add priced lines before completing if you expect automatic totals.");
  }

  return (
    <>
      <Breadcrumbs
        crumbs={[
          { label: "Orders", href: "/admin/orders" },
          { label: orderRef },
        ]}
      />
      <PageHeader
        title={orderRef}
        description={`${o.company?.name ?? "Account"}${o.company?.city ? ` · ${o.company.city}` : ""}`}
        actions={
          canOrders ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="gap-2"
                onClick={() => {
                  syncEditForm(o);
                  setEditOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" aria-hidden />
                Edit details
              </Button>
              {isDraft ? (
                <Button
                  type="button"
                  size="lg"
                  disabled={transitionMutation.isPending}
                  onClick={() => transitionMutation.mutate({ target_status: "active" })}
                >
                  {transitionMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                  Mark active
                </Button>
              ) : null}
              {!isCompleted && !isCancelled ? (
                <Button type="button" variant="destructive" size="lg" onClick={() => setCancelDialogOpen(true)}>
                  Cancel order
                </Button>
              ) : null}
            </div>
          ) : null
        }
      />

      <AlertDialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete this order?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  This marks the order as completed and records the completion time. Generate an invoice draft as a separate
                  step when you are ready — drafts are never sent automatically.
                </p>
                {completeWarnings.length > 0 ? (
                  <ul className="list-inside list-disc space-y-1 text-amber-800 dark:text-amber-200">
                    {completeWarnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Back</AlertDialogCancel>
            <Button type="button" size="lg" disabled={completeMutation.isPending} onClick={() => completeMutation.mutate()}>
              {completeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Confirm complete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
            <AlertDialogDescription>
              Cancelling is blocked while a sent, paid, or overdue invoice exists. Draft invoices may remain — void them first if
              you need a clean slate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason (optional)</Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder="e.g. Customer withdrew collection…"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Back</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              size="lg"
              disabled={transitionMutation.isPending}
              onClick={() =>
                transitionMutation.mutate({
                  target_status: "cancelled",
                  reason: cancelReason.trim() || undefined,
                })
              }
            >
              {transitionMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Confirm cancel
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkKnifeConfirmOpen} onOpenChange={setBulkKnifeConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add {bulkCount} blades?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to register {bulkCount} workshop knives in one step. Tag IDs are assigned automatically. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Back</AlertDialogCancel>
            <Button type="button" size="lg" disabled={bulkMutation.isPending} onClick={() => bulkMutation.mutate()}>
              {bulkMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Yes, add knives
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit order</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="space-y-1">
              <Label>Payment status</Label>
              <Select value={editPayment} onValueChange={setEditPayment}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-ppp">Price per knife (£, ex VAT, optional)</Label>
              <Input id="edit-ppp" inputMode="decimal" value={editPppGbp} onChange={(e) => setEditPppGbp(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-disc">Discount (£, ex VAT)</Label>
              <Input id="edit-disc" inputMode="decimal" value={editDiscountGbp} onChange={(e) => setEditDiscountGbp(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Close
            </Button>
            <Button type="button" size="lg" disabled={updateOrderMutation.isPending} onClick={() => updateOrderMutation.mutate()}>
              {updateOrderMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {canOrders && !isCompleted && !isCancelled && hasWorkForComplete ? (
        <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold">Ready to close out?</div>
            <p className="text-sm text-muted-foreground">Completing records fulfilment time; invoice draft is a separate step.</p>
          </div>
          <Button type="button" size="lg" className="w-full sm:w-auto" onClick={() => setCompleteDialogOpen(true)}>
            Complete order
          </Button>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
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
              <dd className="font-semibold">
                {o.route_id && o.route_name ? (
                  <Link className="text-primary underline" href={`/admin/routes/${o.route_id}`}>
                    {o.route_name}
                  </Link>
                ) : (
                  (o.route_name ?? "—")
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Booking</dt>
              <dd>
                {bd ? (
                  <Link className="font-medium text-primary underline" href={`/admin/bookings/${bd.id}`}>
                    {bd.reference}
                  </Link>
                ) : o.booking?.reference ? (
                  <Link className="font-medium text-primary underline" href={`/admin/bookings/${o.booking.id}`}>
                    {o.booking.reference}
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

          {bd?.contact || bd?.location ? (
            <div className="mt-4 rounded-lg border bg-muted/20 p-3 text-sm">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Contact &amp; location</div>
              {bd.contact ? (
                <p className="mt-2">
                  <span className="font-medium">{bd.contact.name}</span>
                  {bd.contact.email ? (
                    <span className="text-muted-foreground"> · {bd.contact.email}</span>
                  ) : null}
                  {bd.contact.phone ? (
                    <span className="text-muted-foreground"> · {bd.contact.phone}</span>
                  ) : null}
                </p>
              ) : null}
              {bd.location ? (
                <p className="mt-1 text-muted-foreground">
                  {[bd.location.label, bd.location.line_one, bd.location.city, bd.location.postcode].filter(Boolean).join(", ")}
                </p>
              ) : null}
            </div>
          ) : null}
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
                  <dd className="font-medium tabular-nums">{formatGBP(o.invoice.subtotal_pence)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">VAT</dt>
                  <dd className="font-medium tabular-nums">{formatGBP(o.invoice.tax_pence)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Total</dt>
                  <dd className="font-semibold tabular-nums">{formatGBP(o.invoice.total_pence)}</dd>
                </div>
              </dl>
              {o.invoice.line_items && o.invoice.line_items.length > 0 ? (
                <div className="rounded-md border bg-background/80 p-2 text-xs">
                  <div className="font-medium text-muted-foreground">Draft lines</div>
                  <ul className="mt-2 space-y-1">
                    {o.invoice.line_items.map((li, i) => (
                      <li key={`${li.description}-${i}`} className="flex justify-between gap-2">
                        <span className="min-w-0 flex-1 truncate">
                          {li.quantity}× {li.description}
                        </span>
                        <span className="shrink-0 tabular-nums">{li.formatted_line_total ?? formatGBP(li.line_total_pence)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <Button asChild variant="secondary" size="lg" className="w-full">
                <Link href={`/admin/invoices/${o.invoice.id}`}>Open invoice</Link>
              </Button>
            </>
          ) : isCompleted ? (
            <>
              <p className="text-sm text-muted-foreground">No invoice yet. Generate a draft from this order (not sent).</p>
              {canInvoice ? (
                <Button
                  type="button"
                  className="w-full gap-2"
                  size="lg"
                  disabled={invoiceDraftMutation.isPending}
                  onClick={() => invoiceDraftMutation.mutate()}
                >
                  {invoiceDraftMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  Generate invoice draft
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">Your role cannot create invoices.</p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Complete the order to create an invoice draft.</p>
          )}
        </Card>

        <Card className="p-4 lg:col-span-2">
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
              <dd className="font-semibold">{formatGBP(o.price_per_knife_pence ?? 0)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Discount</dt>
              <dd className="font-semibold">{formatGBP(o.discount_pence ?? 0)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-semibold">{formatGBP(o.subtotal_pence ?? 0)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">VAT</dt>
              <dd className="font-semibold">{formatGBP(o.tax_pence ?? 0)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total</dt>
              <dd className="font-semibold">{formatGBP(o.total_pence ?? 0)}</dd>
            </div>
          </dl>
        </Card>

        <Card className="flex flex-col gap-3 p-4">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Status timeline</div>
          <ol className="space-y-2 text-sm">
            {(o.status_timeline ?? []).map((m) => (
              <li key={m.key + (m.at ?? "")} className="flex flex-col border-l-2 border-primary/30 pl-3">
                <span className="font-medium">{m.label}</span>
                <span className="text-xs text-muted-foreground">
                  {m.at ? new Date(m.at).toLocaleString("en-GB") : "—"}
                </span>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="p-4 lg:col-span-3">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Workshop photos</div>
          <p className="mt-2 text-sm text-muted-foreground">
            Photo capture for orders is not enabled yet — use knife-level photos from the blades list when needed.
          </p>
        </Card>

        <Card className="p-4 lg:col-span-3">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Activity &amp; audit</div>
          <div className="mt-2">
            <AuditTimeline items={(o.audit_timeline ?? []) as AuditTimelineRow[]} showPayload />
          </div>
        </Card>

        {canKnives && canOrders && !isCompleted && !isCancelled ? (
          <Card className="flex flex-col gap-3 p-4 lg:col-span-3">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Manifest &amp; lifecycle</div>
            <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2" variant="default" size="lg" type="button">
                    <Plus className="h-4 w-4" aria-hidden />
                    Add one knife
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Register a single blade</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 text-sm">
                    <div className="space-y-1">
                      <Label>Type / category</Label>
                      <Select value={addKnifeType} onValueChange={setAddKnifeType}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {KNIFE_TYPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="add-label">Label (customer-visible)</Label>
                      <Input id="add-label" value={addLabel} onChange={(e) => setAddLabel(e.target.value)} placeholder="e.g. Head chef primary" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="add-desc">Service / work description</Label>
                      <Textarea
                        id="add-desc"
                        rows={2}
                        value={addDescription}
                        onChange={(e) => setAddDescription(e.target.value)}
                        placeholder="What we are doing on this visit…"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="add-cond">Condition before</Label>
                      <Textarea id="add-cond" rows={2} value={addCondition} onChange={(e) => setAddCondition(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="add-dmg">Damage / internal notes</Label>
                      <Textarea id="add-dmg" rows={2} value={addDamageNotes} onChange={(e) => setAddDamageNotes(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="add-notes">Staff notes</Label>
                      <Textarea id="add-notes" rows={2} value={addNotes} onChange={(e) => setAddNotes(e.target.value)} />
                    </div>
                    <p className="text-xs text-muted-foreground">A unique tag_id is allocated automatically.</p>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                      Close
                    </Button>
                    <Button type="button" size="lg" disabled={addKnifeMutation.isPending} onClick={() => addKnifeMutation.mutate()}>
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
                  <Button className="gap-2" variant="secondary" size="lg" type="button">
                    <ListPlus className="h-4 w-4" aria-hidden />
                    Bulk lines (priced)
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add multiple billable lines</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground">
                    Each row is one workshop line: pick an existing blade for <strong>resharpening</strong> (quantity locked to 1) or
                    register new blades (quantity duplicates the row). Unit price is ex-VAT (GBP). Service history stays on the blade
                    when you attach inventory.
                  </p>
                  <div className="space-y-4">
                    {bulkLines.map((row, idx) => (
                      <div key={row.key} className="rounded-lg border border-border p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-muted-foreground">Row {idx + 1}</span>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-10 px-3"
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
                              <span className="ml-1 hidden sm:inline">Duplicate</span>
                            </Button>
                            {bulkLines.length > 1 ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-10 text-destructive"
                                onClick={() => setBulkLines((r) => r.filter((x) => x.key !== row.key))}
                              >
                                Remove
                              </Button>
                            ) : null}
                          </div>
                        </div>
                        <KnifeLookup
                          label="Existing knife (resharpening)"
                          value={row.knifeId}
                          onChange={(id) => setBulkLine(row.key, { knifeId: id })}
                          disabled={!o.company_id}
                          nullable
                          extraParams={
                            o.company_id ? { company_id: o.company_id, unassigned_only: true } : undefined
                          }
                          placeholder="Search by tag or label…"
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
                            <Select
                              value={row.knifeType || "__pick__"}
                              onValueChange={(v) => setBulkLine(row.key, { knifeType: v === "__pick__" ? "" : v, knifeId: null })}
                              disabled={!!row.knifeId}
                            >
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Category" />
                              </SelectTrigger>
                              <SelectContent className="max-h-72">
                                <SelectItem value="__pick__">Select…</SelectItem>
                                {KNIFE_TYPE_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
                              className="h-11"
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
                              className="h-11"
                              value={row.unitPounds}
                              onChange={(e) => setBulkLine(row.key, { unitPounds: e.target.value })}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Label>Line notes</Label>
                            <Input className="h-11" value={row.notes} onChange={(e) => setBulkLine(row.key, { notes: e.target.value })} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full"
                    onClick={() => setBulkLines((r) => [...r, makeEmptyBulkRow()])}
                  >
                    + Add another row
                  </Button>
                  <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={() => setBulkLinesOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="button" size="lg" disabled={bulkLinesMutation.isPending} onClick={() => bulkLinesMutation.mutate()}>
                      {bulkLinesMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                      Submit lines
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2" variant="secondary" size="lg" type="button">
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
                      className="h-11"
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
                    <Button type="button" size="lg" disabled={bulkMutation.isPending} onClick={requestBulkKnives}>
                      {bulkMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                      Generate
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={attachOpen} onOpenChange={setAttachOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2" variant="outline" size="lg" type="button">
                    Attach existing knife
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Resharpening — link inventory knife</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground">
                    Search blades on file for {o.company?.name ?? "this customer"} that are not already on another order. History
                    stays on the blade; this only sets the current workshop order. To register a brand-new blade, use{" "}
                    <strong>Add one knife</strong> instead.
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
                      size="lg"
                      disabled={attachMutation.isPending || !attachKnifeId}
                      onClick={() => attachKnifeId && !attachMutation.isPending && attachMutation.mutate(attachKnifeId)}
                    >
                      {attachMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                      Attach to order
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

            </div>

            <p className="text-xs text-muted-foreground">
              Tag IDs are generated server-side. Knife workflow continues on{" "}
              <Link href="/admin/knives" className="text-primary underline">
                Knives
              </Link>
              .
            </p>
          </Card>
        ) : null}
      </div>

      <Separator className="my-6" />

      <div className="text-base font-semibold">Billable lines</div>
      {(o.items ?? []).length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          No priced lines yet — use <strong className="font-medium text-foreground">Bulk lines (priced)</strong> to add blades with
          unit rates (and optional inventory link per row).
        </p>
      ) : (
        <>
          <div className="mt-3 hidden md:block overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Unit (ex VAT)</th>
                  <th className="px-3 py-2">Line</th>
                  <th className="px-3 py-2">Blade</th>
                </tr>
              </thead>
              <tbody>
                {(o.items ?? []).map((line) => (
                  <tr key={line.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{line.description}</td>
                    <td className="px-3 py-2 tabular-nums">{line.quantity}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {line.formatted_unit_amount ?? formatGBP(line.unit_amount_pence)}
                    </td>
                    <td className="px-3 py-2 tabular-nums font-medium">
                      {line.formatted_line_total ?? formatGBP(line.line_total_pence ?? line.quantity * line.unit_amount_pence)}
                    </td>
                    <td className="px-3 py-2">
                      {line.knife_id ? (
                        <Link className="text-primary underline" href={`/admin/knives/${line.knife_id}`}>
                          Open
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-3 space-y-2 md:hidden">
            {(o.items ?? []).map((line) => (
              <li key={line.id} className="rounded-lg border bg-muted/20 p-3 text-sm">
                <div className="font-medium">{line.description}</div>
                <div className="mt-1 text-muted-foreground">
                  {line.quantity} × {line.formatted_unit_amount ?? formatGBP(line.unit_amount_pence)} ex VAT
                </div>
                <div className="mt-1 font-semibold tabular-nums">
                  Line: {line.formatted_line_total ?? formatGBP(line.line_total_pence ?? line.quantity * line.unit_amount_pence)}
                </div>
                {line.knife_id ? (
                  <Button asChild variant="link" className="mt-1 h-auto px-0 text-base">
                    <Link href={`/admin/knives/${line.knife_id}`}>Blade record</Link>
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}

      <Separator className="my-6" />

      <div className="text-base font-semibold">Knives on this order</div>
      {(o.knives ?? []).length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No blades registered yet — use bulk or single add above.</p>
      ) : null}
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {(o.knives ?? []).map((k) => (
          <Card key={k.id} className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-mono text-xs text-muted-foreground">{k.tag_id}</div>
                <div className="truncate font-semibold">
                  {("label" in k && typeof k.label === "string" && k.label) || k.knife_type || "Blade"}
                </div>
              </div>
              <StatusBadge kind="knife" status={k.status ?? ""} />
            </div>
            <Button asChild variant="link" className="mt-2 h-auto px-0 text-base">
              <Link href={`/admin/knives/${k.id}`}>Open lifecycle</Link>
            </Button>
          </Card>
        ))}
      </div>
    </>
  );
}
