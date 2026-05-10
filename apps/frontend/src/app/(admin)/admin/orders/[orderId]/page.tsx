"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Copy, FileText, ListChecks, ListPlus, Loader2, Plus, PackagePlus, Pencil } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  BulkWorkshopSummarySchema,
  OrderInvoiceDraftResponseSchema,
  parseAdminOrderDetailEnvelope,
} from "@/lib/api/admin-orders-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { coerceGbpInputToMinorUnits, formatGBP, parseGbpInputToMinorUnits } from "@/lib/format/money";
import { KNIFE_TYPE_OPTIONS } from "@/lib/knife-catalog";
import { canKnifeTransition, isRiskyKnifeTransition } from "@/lib/knife-status-workflow";
import { useBackendMe } from "@/hooks/use-backend-me";

import type { z } from "zod";

import { AdminKnifeQuickPhotosDialog } from "@/components/admin/AdminKnifeQuickPhotosDialog";
import { AuditTimeline, type AuditTimelineRow } from "@/components/admin/AuditTimeline";
import { WorkshopEvidenceSection } from "@/components/admin/WorkshopEvidenceSection";
import { KnifePhotoTile } from "@/components/admin/KnifePhotoTile";
import { KnifeLookup } from "@/components/admin/lookups/AsyncEntityLookup";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

function AdminOrderKnifePhotoThumb({
  photoId,
  caption,
}: {
  photoId: string;
  caption?: string | null;
}) {
  const admin = useAdminApi();
  const fetchBlobRef = useRef(admin.fetchBlob);
  fetchBlobRef.current = admin.fetchBlob;
  const load = useCallback(() => fetchBlobRef.current(`/api/admin/knife-photos/${photoId}/file`), [photoId]);

  return (
    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-muted">
      <KnifePhotoTile
        load={load}
        alt={caption?.trim() ? caption : "Knife photo"}
        loadingClassName="flex h-12 w-12 items-center justify-center bg-muted"
      />
    </div>
  );
}

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

const BULK_WORKSHOP_STATUS_OPTIONS = [
  { value: "inspected", label: "Mark inspected" },
  { value: "sharpening", label: "Mark sharpening" },
  { value: "quality_checked", label: "Mark quality checked" },
  { value: "returned", label: "Mark returned" },
] as const;

type BulkWorkshopMode =
  | "knife_status"
  | "append_notes"
  | "knife_type"
  | "line_prices"
  | "inspection_visibility";

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
  const [bulkLinesThresholdOpen, setBulkLinesThresholdOpen] = useState(false);
  const pendingBulkLinesRef = useRef<Record<string, unknown>[] | null>(null);
  const [riskyBladeConfirmOpen, setRiskyBladeConfirmOpen] = useState(false);
  const [pendingRiskyBlade, setPendingRiskyBlade] = useState<
    | { kind: "knife"; knifeId: string; target_status: string; label: string }
    | { kind: "line"; itemId: string; target_status: string; label: string }
    | null
  >(null);
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
  const [statusStepConfirmOpen, setStatusStepConfirmOpen] = useState(false);
  const [pendingStatusStep, setPendingStatusStep] = useState<{ value: string; label: string } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editDiscountGbp, setEditDiscountGbp] = useState("");
  const [editPppGbp, setEditPppGbp] = useState("");
  const [editPayment, setEditPayment] = useState("unpaid");

  const [selKnifeIds, setSelKnifeIds] = useState<string[]>([]);
  const [selLineIds, setSelLineIds] = useState<string[]>([]);
  const [bulkWorkshopOpen, setBulkWorkshopOpen] = useState(false);
  const [bulkWorkshopConfirmOpen, setBulkWorkshopConfirmOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<BulkWorkshopMode>("knife_status");
  const [bulkTargetStatus, setBulkTargetStatus] = useState<string>("inspected");
  const [bulkAppendNote, setBulkAppendNote] = useState("");
  const [bulkTypeValue, setBulkTypeValue] = useState("chefs");
  const [bulkUnitGbp, setBulkUnitGbp] = useState("5.00");
  const [bulkInspectionVisible, setBulkInspectionVisible] = useState(false);
  const [bulkAckPrice, setBulkAckPrice] = useState(false);
  const [bulkAckVisibility, setBulkAckVisibility] = useState(false);
  const [bulkSummaryBanner, setBulkSummaryBanner] = useState<z.infer<typeof BulkWorkshopSummarySchema> | null>(null);

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
      return parseAdminOrderDetailEnvelope(res.data);
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
      return parseAdminOrderDetailEnvelope(res.data, "Unexpected order response.");
    },
    onSuccess: (_, vars) => {
      if (vars.target_status === "cancelled") {
        toast.success("Order cancelled.");
      } else {
        toast.success("Order status updated.");
      }
      setCancelDialogOpen(false);
      setCancelReason("");
      setStatusStepConfirmOpen(false);
      setPendingStatusStep(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-order", orderId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const knifeTransitionMutation = useMutation({
    mutationFn: async (vars: { knifeId: string; target_status: string }) => {
      const res = await admin.json<unknown>(`/api/admin/knives/${vars.knifeId}/transition`, {
        method: "POST",
        body: JSON.stringify({ target_status: vars.target_status }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: () => {
      toast.success("Blade status updated.");
      void queryClient.invalidateQueries({ queryKey: ["admin-order", orderId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-knives"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const orderItemTransitionMutation = useMutation({
    mutationFn: async (vars: { itemId: string; target_status: string }) => {
      const res = await admin.json<unknown>(`/api/admin/orders/${orderId}/items/${vars.itemId}/transition`, {
        method: "POST",
        body: JSON.stringify({ target_status: vars.target_status }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return parseAdminOrderDetailEnvelope(res.data, "Unexpected order response.");
      void queryClient.invalidateQueries({ queryKey: ["admin-order", orderId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleSelKnife = useCallback((id: string) => {
    setSelKnifeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const toggleSelLine = useCallback((id: string) => {
    setSelLineIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  useEffect(() => {
    const d = orderQuery.data;
    if (!d) {
      return;
    }
    const k = new Set((d.knives ?? []).map((x) => x.id));
    const l = new Set((d.items ?? []).map((x) => x.id));
    setSelKnifeIds((ids) => ids.filter((id) => k.has(id)));
    setSelLineIds((ids) => ids.filter((id) => l.has(id)));
  }, [orderQuery.data]);

  const bulkWorkshopMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await admin.json<unknown>(`/api/admin/orders/${orderId}/bulk-workshop`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return parseAdminOrderDetailEnvelope(res.data, "Unexpected bulk workshop response.");
    },
    onSuccess: (data) => {
      const raw = data.bulk_workshop_summary;
      const sumParsed = raw !== undefined ? BulkWorkshopSummarySchema.safeParse(raw) : null;
      const summary = sumParsed?.success ? sumParsed.data : null;
      if (summary) {
        setBulkSummaryBanner(summary);
      }
      const applied = summary?.any_applied === true;
      const sk = (summary?.skipped_knives as { knife_id?: string; reason?: string }[] | undefined)?.length ?? 0;
      const sl =
        (summary?.skipped_line_items as { order_item_id?: string; reason?: string }[] | undefined)?.length ?? 0;
      if (applied) {
        toast.success(
          sk + sl > 0 ? `Bulk action applied. ${sk + sl} row(s) skipped — see summary below.` : "Bulk workshop action applied.",
        );
      } else {
        toast.message("No changes applied", {
          description: "Every selected row was skipped (see summary). Check statuses or selection.",
        });
      }
      setBulkWorkshopConfirmOpen(false);
      setBulkWorkshopOpen(false);
      setSelKnifeIds([]);
      setSelLineIds([]);
      setBulkAckPrice(false);
      setBulkAckVisibility(false);
      void queryClient.invalidateQueries({ queryKey: ["admin-order", orderId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-knives"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkStatusInvalidPreview = useMemo(() => {
    const d = orderQuery.data;
    if (!d || bulkMode !== "knife_status") {
      return [] as { id: string; label: string; reason: string }[];
    }
    const out: { id: string; label: string; reason: string }[] = [];
    for (const kid of selKnifeIds) {
      const kn = (d.knives ?? []).find((k) => k.id === kid);
      const st = kn?.status ?? null;
      if (!canKnifeTransition(st, bulkTargetStatus)) {
        const lb = kn && typeof (kn as { label?: string }).label === "string" ? (kn as { label: string }).label : "";
        const label = [kn?.tag_id, lb || kn?.knife_type].filter(Boolean).join(" · ") || kid.slice(0, 8);
        out.push({
          id: kid,
          label,
          reason: `Cannot go from ${st || "unknown"} to ${bulkTargetStatus}.`,
        });
      }
    }
    for (const lid of selLineIds) {
      const line = (d.items ?? []).find((l) => l.id === lid);
      const st = line?.effective_status ?? line?.service_status ?? null;
      if (!canKnifeTransition(st, bulkTargetStatus)) {
        out.push({
          id: lid,
          label: line?.description?.slice(0, 48) || lid.slice(0, 8),
          reason: `Cannot go from ${st || "unknown"} to ${bulkTargetStatus}.`,
        });
      }
    }
    return out;
  }, [orderQuery.data, bulkMode, selKnifeIds, selLineIds, bulkTargetStatus]);

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
      return parseAdminOrderDetailEnvelope(res.data, "Unexpected order response.");
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
      return parseAdminOrderDetailEnvelope(res.data, "Bad response.");
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
      toast.success(
        data.already_existed
          ? `Invoice already on file${data.invoice.invoice_number ? ` (${data.invoice.invoice_number})` : ""}.`
          : `Draft invoice created${data.invoice.invoice_number ? `: ${data.invoice.invoice_number}` : "."}`,
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

  const buildBulkOrderLineItems = (): { items: Record<string, unknown>[]; totalQty: number } => {
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
    return { items, totalQty };
  };

  const requestBulkLinesSubmit = () => {
    try {
      const { items, totalQty } = buildBulkOrderLineItems();
      if (totalQty > BULK_CONFIRM_THRESHOLD) {
        pendingBulkLinesRef.current = items;
        setBulkLinesThresholdOpen(true);
        return;
      }
      bulkLinesMutation.mutate(items);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid rows.");
    }
  };

  const bulkLinesMutation = useMutation({
    mutationFn: async (items: Record<string, unknown>[]) => {
      const res = await admin.json<unknown>(`/api/admin/orders/${orderId}/bulk-order-items`, {
        method: "POST",
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return parseAdminOrderDetailEnvelope(res.data, "Unexpected order response.");
      setBulkLinesOpen(false);
      setBulkLinesThresholdOpen(false);
      pendingBulkLinesRef.current = null;
      setBulkLines([makeEmptyBulkRow()]);
      void queryClient.invalidateQueries({ queryKey: ["admin-order", orderId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-knives"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e: Error) => {
      toast.error(e.message);
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
  const allowedNext = o.allowed_next_statuses ?? [];
  const mayCancel = allowedNext.some((x) => x.value === "cancelled");
  const mayComplete = allowedNext.some((x) => x.value === "completed") && hasWorkForComplete;
  const linearWorkflow = allowedNext.filter((x) => x.value !== "completed" && x.value !== "cancelled");
  const showWorkflowControls = canOrders && (linearWorkflow.length > 0 || mayComplete);
  const showWorkshopProgress = Boolean(o.workshop_progress);
  const showWorkshopFulfilmentCard = showWorkshopProgress || showWorkflowControls;
  const isCancelled = o.status === "cancelled";
  const isReturned = o.status === "returned";
  const lockOrderManifest = isCancelled || isReturned || o.status === "completed" || o.status === "invoiced";
  const canUpdateBladeStatuses = canKnives && !isCancelled;
  /** Invoice draft API currently requires `completed` (invoiced is a later lifecycle step). */
  const mayGenerateInvoiceDraft = o.status === "completed";
  const bd = o.booking_detail;
  const lineOnlyLines = (o.items ?? []).filter((li) => !li.knife_id);

  const requestBulkWorkshopConfirm = () => {
    if (bulkMode === "knife_status") {
      if (selKnifeIds.length === 0 && selLineIds.length === 0) {
        toast.error("Select at least one blade or line-only item.");
        return;
      }
    } else if (bulkMode === "line_prices") {
      if (selLineIds.length === 0) {
        toast.error("Select at least one billable line.");
        return;
      }
      try {
        const p = parseGbpInputToMinorUnits(bulkUnitGbp);
        if (p === undefined) {
          throw new Error("Enter a valid unit price (GBP).");
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Enter a valid unit price (GBP).");
        return;
      }
      if (!bulkAckPrice) {
        toast.error("Acknowledge the unit price change to continue.");
        return;
      }
    } else if (bulkMode === "inspection_visibility") {
      if (selKnifeIds.length === 0) {
        toast.error("Select at least one blade.");
        return;
      }
      if (!bulkAckVisibility) {
        toast.error("Confirm customer visibility for inspection notes to continue.");
        return;
      }
    } else if (bulkMode === "append_notes") {
      if (selKnifeIds.length === 0) {
        toast.error("Select at least one blade.");
        return;
      }
      if (!bulkAppendNote.trim()) {
        toast.error("Enter a note to append.");
        return;
      }
    } else if (bulkMode === "knife_type") {
      if (selKnifeIds.length === 0) {
        toast.error("Select at least one blade.");
        return;
      }
      if (!bulkTypeValue.trim()) {
        toast.error("Choose a service / blade type.");
        return;
      }
    }
    setBulkWorkshopConfirmOpen(true);
  };

  const applyBulkWorkshop = () => {
    let body: Record<string, unknown>;
    if (bulkMode === "knife_status") {
      body = {
        mode: "knife_status",
        knife_ids: selKnifeIds,
        line_item_ids: selLineIds,
        target_status: bulkTargetStatus,
      };
    } else if (bulkMode === "append_notes") {
      body = { mode: "append_notes", knife_ids: selKnifeIds, append_notes: bulkAppendNote.trim() };
    } else if (bulkMode === "knife_type") {
      body = { mode: "knife_type", knife_ids: selKnifeIds, knife_type: bulkTypeValue.trim() };
    } else if (bulkMode === "line_prices") {
      let pence = 0;
      try {
        const raw = parseGbpInputToMinorUnits(bulkUnitGbp);
        if (raw === undefined) {
          throw new Error("Enter a unit price.");
        }
        pence = raw;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Invalid unit price.");
        return;
      }
      body = {
        mode: "line_prices",
        line_item_ids: selLineIds,
        unit_amount_pence: pence,
        confirm_price_change: true,
      };
    } else {
      body = {
        mode: "inspection_visibility",
        knife_ids: selKnifeIds,
        inspection_customer_visible: bulkInspectionVisible,
        confirm_customer_visibility: true,
      };
    }
    bulkWorkshopMutation.mutate(body);
  };

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
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span>
              {`${o.company?.name ?? "Account"}${o.company?.city ? ` · ${o.company.city}` : ""}`}
            </span>
            {o.company?.is_deleted ? (
              <Badge variant="secondary" className="font-normal">
                Removed from CRM
              </Badge>
            ) : null}
          </span>
        }
        titleRowEnd={<StatusBadge kind="order" status={o.status ?? ""} />}
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
              {mayCancel ? (
                <Button type="button" variant="destructive" size="lg" onClick={() => setCancelDialogOpen(true)}>
                  Cancel order
                </Button>
              ) : null}
            </div>
          ) : null
        }
      />

      {o.staff_next_actions && o.staff_next_actions.length > 0 ? (
        <Alert className="mt-6 border-primary/25 bg-primary/5">
          <ListChecks className="h-4 w-4" aria-hidden />
          <AlertTitle>Next steps</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-inside list-disc space-y-1">
              {o.staff_next_actions.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

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

      <AlertDialog
        open={statusStepConfirmOpen}
        onOpenChange={(open) => {
          setStatusStepConfirmOpen(open);
          if (!open) {
            setPendingStatusStep(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingStatusStep ? `Confirm: ${pendingStatusStep.label}?` : "Confirm order step"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This order status change may be significant. Continue only if the workshop state matches what you expect.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Back</AlertDialogCancel>
            <Button
              type="button"
              size="lg"
              disabled={transitionMutation.isPending || pendingStatusStep === null}
              onClick={() => {
                if (pendingStatusStep) {
                  transitionMutation.mutate({ target_status: pendingStatusStep.value });
                }
              }}
            >
              {transitionMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Confirm
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

      <AlertDialog
        open={bulkLinesThresholdOpen}
        onOpenChange={(open) => {
          setBulkLinesThresholdOpen(open);
          if (!open) {
            pendingBulkLinesRef.current = null;
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add many billable units?</AlertDialogTitle>
            <AlertDialogDescription>
              You are adding more than {BULK_CONFIRM_THRESHOLD} billable units in one submission. Continue only if the quantities are
              correct.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Back</AlertDialogCancel>
            <Button
              type="button"
              size="lg"
              disabled={bulkLinesMutation.isPending || pendingBulkLinesRef.current === null}
              onClick={() => {
                const items = pendingBulkLinesRef.current;
                if (items) {
                  bulkLinesMutation.mutate(items);
                }
              }}
            >
              {bulkLinesMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Add lines
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={riskyBladeConfirmOpen}
        onOpenChange={(open) => {
          setRiskyBladeConfirmOpen(open);
          if (!open) {
            setPendingRiskyBlade(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingRiskyBlade ? `Confirm: ${pendingRiskyBlade.label}?` : "Confirm blade step"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This workshop status change may be significant. Continue only if the physical state matches.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Back</AlertDialogCancel>
            <Button
              type="button"
              size="lg"
              variant="destructive"
              disabled={
                pendingRiskyBlade === null ||
                knifeTransitionMutation.isPending ||
                orderItemTransitionMutation.isPending
              }
              onClick={() => {
                const p = pendingRiskyBlade;
                if (p?.kind === "knife") {
                  knifeTransitionMutation.mutate({ knifeId: p.knifeId, target_status: p.target_status });
                } else if (p?.kind === "line") {
                  orderItemTransitionMutation.mutate({ itemId: p.itemId, target_status: p.target_status });
                }
                setRiskyBladeConfirmOpen(false);
                setPendingRiskyBlade(null);
              }}
            >
              {knifeTransitionMutation.isPending || orderItemTransitionMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              Confirm
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkWorkshopConfirmOpen} onOpenChange={setBulkWorkshopConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply bulk workshop action?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  You are about to run <strong className="text-foreground">{bulkMode.replace(/_/g, " ")}</strong> on{" "}
                  <strong className="text-foreground">
                    {bulkMode === "knife_status"
                      ? `${selKnifeIds.length} blade(s) and ${selLineIds.length} line-only row(s)`
                      : bulkMode === "line_prices"
                        ? `${selLineIds.length} billable line(s)`
                        : `${selKnifeIds.length} blade(s)`}
                  </strong>
                  . Invalid transitions are skipped per row and reported after submission — nothing is silently forced.
                </p>
                {bulkMode === "knife_status" && isRiskyKnifeTransition(bulkTargetStatus) ? (
                  <p className="text-amber-800 dark:text-amber-200">This status change can be consequential — double-check the selection.</p>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Back</AlertDialogCancel>
            <Button type="button" size="lg" disabled={bulkWorkshopMutation.isPending} onClick={applyBulkWorkshop}>
              {bulkWorkshopMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Apply
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

      {showWorkshopFulfilmentCard ? (
        <Card className="p-4">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Workshop &amp; fulfilment</div>

          {showWorkshopProgress && o.workshop_progress ? (
            <div className="mt-3">
              <div className="text-xs font-medium text-muted-foreground">Blades &amp; lines</div>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{o.workshop_progress.knife_count}</span> blade(s) on this order
                {o.workshop_progress.line_only_units > 0 ? (
                  <>
                    {" "}
                    · <span className="font-medium text-foreground">{o.workshop_progress.line_only_units}</span> unit(s) on lines
                    without a blade record
                  </>
                ) : null}
                {o.workshop_progress.all_knives_complete ? (
                  <span className="text-foreground"> — all blades returned or cancelled.</span>
                ) : null}
              </p>
              {o.workshop_progress.by_status && Object.keys(o.workshop_progress.by_status).length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-2 text-xs">
                  {Object.entries(o.workshop_progress.by_status).map(([st, n]) => (
                    <li key={st} className="rounded-md border bg-muted/30 px-2 py-1 capitalize text-muted-foreground">
                      <span className="font-medium text-foreground">{st.replace(/_/g, " ")}</span> · {n}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {showWorkflowControls ? (
            <>
              <p className={`text-sm text-muted-foreground ${showWorkshopProgress ? "mt-4 border-t border-border pt-4" : "mt-2"}`}>
                Advance order status one step at a time; risky moves ask for confirmation. Completing the order records fulfilment
                timing — generating an invoice draft is a separate step.
              </p>

              {canOrders && linearWorkflow.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {linearWorkflow.map((step) => (
                    <Button
                      key={step.value}
                      type="button"
                      size="lg"
                      variant={step.risky ? "secondary" : "default"}
                      disabled={transitionMutation.isPending}
                      onClick={() => {
                        if (step.risky) {
                          setPendingStatusStep({ value: step.value, label: step.label });
                          setStatusStepConfirmOpen(true);
                        } else {
                          transitionMutation.mutate({ target_status: step.value });
                        }
                      }}
                    >
                      {step.label}
                    </Button>
                  ))}
                </div>
              ) : null}

              {canOrders && mayComplete ? (
                <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm font-semibold">Ready to close out?</div>
                  <Button type="button" size="lg" className="w-full sm:w-auto shrink-0" onClick={() => setCompleteDialogOpen(true)}>
                    Complete order
                  </Button>
                </div>
              ) : null}
            </>
          ) : null}
        </Card>
      ) : null}

      {(o.order_damage_reports ?? []).length > 0 ? (
        <Card className="p-4">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Damage reports (order)</div>
          <p className="mt-1 text-xs text-muted-foreground">
            All structured damage rows linked to blades on this order. Open a blade to edit or archive.
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {(o.order_damage_reports ?? []).map((row) => (
              <li key={row.id} className="rounded-md border bg-muted/20 px-3 py-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {row.knife_label || row.knife_tag_id ? (
                    <span className="font-medium text-foreground">
                      {row.knife_label ?? row.knife_tag_id}
                      {row.knife_tag_id && row.knife_label ? ` · ${row.knife_tag_id}` : null}
                    </span>
                  ) : null}
                  {row.severity ? <Badge variant="outline">{row.severity}</Badge> : null}
                  {row.status ? <Badge variant="secondary">{row.status}</Badge> : null}
                  {row.customer_visible ? <span className="text-foreground">Customer-visible</span> : null}
                </div>
                <p className="mt-1 whitespace-pre-wrap">{row.description ?? row.details ?? "—"}</p>
                {row.knife_id ? (
                  <Link className="mt-2 inline-block text-xs font-medium text-primary underline" href={`/admin/knives/${row.knife_id}`}>
                    Blade record
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Overview</div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Company</dt>
              <dd className="space-y-1 font-semibold">
                <div>
                  {o.company?.name ?? "—"}
                  {o.company?.city ? (
                    <span className="font-normal text-muted-foreground"> · {o.company.city}</span>
                  ) : null}
                </div>
                {o.company?.is_deleted ? (
                  <Badge variant="secondary" className="font-normal">
                    Removed from CRM
                  </Badge>
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
                <span className={o.invoice.invoice_number ? "font-mono text-sm" : "text-sm"}>
                  {o.invoice.invoice_number ?? "Unnumbered invoice"}
                </span>
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
          ) : mayGenerateInvoiceDraft ? (
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
          ) : o.status === "invoiced" ? (
            <p className="text-sm text-muted-foreground">
              This order is marked invoiced. Open the linked invoice from finance records if it is missing here.
            </p>
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

        {canOrders ? (
          <div className="lg:col-span-3">
            <WorkshopEvidenceSection
              uploadUrl={`/api/admin/orders/${orderId}/evidence-photos`}
              photos={orderQuery.data?.evidence_photos ?? []}
              settings={orderQuery.data?.evidence_settings}
              invalidateQueryKeys={[["admin-order", orderId]]}
              knifeLinkOptions={(orderQuery.data?.knives ?? []).map((kn) => ({
                id: kn.id,
                label: [kn.label, kn.tag_id].filter(Boolean).join(" · ") || `${kn.id.slice(0, 8)}…`,
              }))}
              damageReportLinkOptions={(orderQuery.data?.order_damage_reports ?? []).map((dr) => ({
                id: dr.id,
                label: `${dr.knife_label ?? "Blade"} — ${(dr.description ?? dr.details ?? "").slice(0, 48)}`,
              }))}
            />
          </div>
        ) : (
          <Card className="p-4 lg:col-span-3">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Workshop photos</div>
            <p className="mt-2 text-sm text-muted-foreground">Your role cannot upload order evidence.</p>
          </Card>
        )}

        <Card className="p-4 lg:col-span-3">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Activity &amp; audit</div>
          <div className="mt-2">
            <AuditTimeline items={(o.audit_timeline ?? []) as AuditTimelineRow[]} showPayload />
          </div>
        </Card>

        {canKnives && canOrders && !lockOrderManifest ? (
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
                <DialogContent className="max-h-[min(90vh,calc(100dvh-2rem))] overflow-y-auto sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Quick add blade</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 text-sm">
                    <div className="space-y-1">
                      <Label>Type / category</Label>
                      <Select value={addKnifeType} onValueChange={setAddKnifeType}>
                        <SelectTrigger className="h-12">
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
                      <Input
                        id="add-label"
                        className="h-12"
                        value={addLabel}
                        onChange={(e) => setAddLabel(e.target.value)}
                        placeholder="e.g. Head chef primary"
                      />
                    </div>
                    <details className="rounded-lg border border-border/80 bg-muted/20 [&_summary::-webkit-details-marker]:hidden">
                      <summary className="cursor-pointer px-3 py-2.5 text-sm font-medium text-foreground">
                        More detail — optional
                      </summary>
                      <div className="space-y-3 border-t border-border/80 px-3 pb-3 pt-3">
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
                      </div>
                    </details>
                    <p className="text-xs text-muted-foreground">Tag ID is allocated automatically.</p>
                  </div>
                  <DialogFooter className="gap-2 pt-1">
                    <Button type="button" variant="outline" className="min-h-12 w-full sm:w-auto" onClick={() => setAddOpen(false)}>
                      Close
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      className="min-h-12 w-full sm:w-auto"
                      disabled={addKnifeMutation.isPending}
                      onClick={() => addKnifeMutation.mutate()}
                    >
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
                    <Button type="button" size="lg" disabled={bulkLinesMutation.isPending} onClick={requestBulkLinesSubmit}>
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
                    Search blades on file for {o.company?.name ?? "this customer"}. Includes unassigned inventory and knives whose
                    prior order is completed, invoiced, returned, or cancelled. History stays on the blade; this sets the current
                    workshop order. Cross-company attachment is blocked. To register a brand-new blade, use <strong>Add one knife</strong>{" "}
                    instead.
                  </p>
                  <KnifeLookup
                    label="Knife"
                    value={attachKnifeId}
                    onChange={setAttachKnifeId}
                    disabled={!o.company_id}
                    extraParams={
                      o.company_id
                        ? { company_id: o.company_id, resharpen_eligible_only: true }
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

      {bulkSummaryBanner ? (
        <Card className="mb-6 border-primary/35 bg-primary/5 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-semibold">Last bulk workshop result</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Mode: <span className="font-medium text-foreground">{bulkSummaryBanner.mode}</span>
                {bulkSummaryBanner.any_applied === false ? " · Nothing was written (all rows skipped)." : null}
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={() => setBulkSummaryBanner(null)}>
              Dismiss
            </Button>
          </div>
          {Array.isArray(bulkSummaryBanner.skipped_knives) && bulkSummaryBanner.skipped_knives.length > 0 ? (
            <div className="mt-3 text-sm">
              <div className="font-medium text-amber-900 dark:text-amber-100">Skipped blades</div>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
                {(bulkSummaryBanner.skipped_knives as { knife_id?: string; reason?: string }[]).map((row, i) => (
                  <li key={`${row.knife_id ?? i}-sk`}>
                    <span className="font-mono text-foreground">{row.knife_id?.slice(0, 8) ?? "—"}</span>
                    {row.reason ? ` — ${row.reason}` : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {Array.isArray(bulkSummaryBanner.skipped_line_items) && bulkSummaryBanner.skipped_line_items.length > 0 ? (
            <div className="mt-3 text-sm">
              <div className="font-medium text-amber-900 dark:text-amber-100">Skipped lines</div>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
                {(bulkSummaryBanner.skipped_line_items as { order_item_id?: string; reason?: string }[]).map((row, i) => (
                  <li key={`${row.order_item_id ?? i}-sl`}>
                    <span className="font-mono text-foreground">{row.order_item_id?.slice(0, 8) ?? "—"}</span>
                    {row.reason ? ` — ${row.reason}` : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      ) : null}

      {canUpdateBladeStatuses ? (
        <>
          <Card className="mb-6 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-2">
                <ListChecks className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <div className="text-sm font-semibold">Bulk workshop</div>
                  <p className="text-xs text-muted-foreground">
                    {selKnifeIds.length} blade{selKnifeIds.length === 1 ? "" : "s"} and {selLineIds.length} line
                    {selLineIds.length === 1 ? "" : "s"} selected. Use checkboxes on rows and blade cards, then open actions.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10"
                  onClick={() => {
                    setSelKnifeIds((o.knives ?? []).map((k) => k.id));
                    setSelLineIds(lineOnlyLines.map((l) => l.id));
                  }}
                >
                  Select blades + line-only
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10"
                  onClick={() => setSelLineIds((o.items ?? []).map((l) => l.id))}
                >
                  Select all lines
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-10"
                  onClick={() => {
                    setSelKnifeIds([]);
                    setSelLineIds([]);
                  }}
                >
                  Clear
                </Button>
                <Button type="button" size="sm" className="h-10 gap-1" onClick={() => setBulkWorkshopOpen(true)}>
                  <ListChecks className="h-4 w-4" aria-hidden />
                  Bulk actions…
                </Button>
              </div>
            </div>
          </Card>

          <Dialog
            open={bulkWorkshopOpen}
            onOpenChange={(open) => {
              setBulkWorkshopOpen(open);
              if (!open) {
                setBulkAckPrice(false);
                setBulkAckVisibility(false);
              }
            }}
          >
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Bulk workshop action</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="space-y-1">
                  <Label>Action type</Label>
                  <Select
                    value={bulkMode}
                    onValueChange={(v) => {
                      setBulkMode(v as BulkWorkshopMode);
                      setBulkAckPrice(false);
                      setBulkAckVisibility(false);
                    }}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="knife_status">Service status (blades + line-only rows)</SelectItem>
                      <SelectItem value="append_notes">Append staff note (blades)</SelectItem>
                      <SelectItem value="knife_type">Set service / blade type (blades)</SelectItem>
                      <SelectItem value="line_prices">Set unit price ex VAT (billable lines)</SelectItem>
                      <SelectItem value="inspection_visibility">Inspection notes visible to customer (blades)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="text-xs font-medium text-muted-foreground">Selected</div>
                  <ul className="mt-1 max-h-36 overflow-y-auto rounded-md border bg-muted/20 p-2 text-xs">
                    {bulkMode === "line_prices" ? (
                      selLineIds.length === 0 ? (
                        <li className="text-muted-foreground">No lines selected.</li>
                      ) : (
                        selLineIds.map((id) => {
                          const li = (o.items ?? []).find((l) => l.id === id);
                          return (
                            <li key={id} className="truncate py-0.5">
                              Line · {li?.description ?? id.slice(0, 8)}
                            </li>
                          );
                        })
                      )
                    ) : (
                      <>
                        {selKnifeIds.length === 0 ? (
                          <li className="text-muted-foreground">No blades selected.</li>
                        ) : (
                          selKnifeIds.map((id) => {
                            const kn = (o.knives ?? []).find((k) => k.id === id);
                            const lb =
                              kn && typeof (kn as { label?: string }).label === "string"
                                ? (kn as { label: string }).label
                                : "";
                            return (
                              <li key={id} className="truncate py-0.5">
                                Blade · {kn?.tag_id ?? ""} {lb || kn?.knife_type || id.slice(0, 8)}
                              </li>
                            );
                          })
                        )}
                        {bulkMode === "knife_status" && selLineIds.length > 0 ? (
                          <>
                            {selLineIds.map((id) => {
                              const li = (o.items ?? []).find((l) => l.id === id);
                              return (
                                <li key={`l-${id}`} className="truncate py-0.5">
                                  Line-only · {li?.description ?? id.slice(0, 8)}
                                </li>
                              );
                            })}
                          </>
                        ) : null}
                      </>
                    )}
                  </ul>
                </div>

                {bulkMode === "knife_status" ? (
                  <div className="space-y-1">
                    <Label>Target status</Label>
                    <Select value={bulkTargetStatus} onValueChange={setBulkTargetStatus}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BULK_WORKSHOP_STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isRiskyKnifeTransition(bulkTargetStatus) ? (
                      <p className="text-xs text-amber-800 dark:text-amber-200">
                        This transition is sensitive for some workflows — invalid rows are skipped server-side; you will confirm
                        before applying.
                      </p>
                    ) : null}
                    {bulkStatusInvalidPreview.length > 0 ? (
                      <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
                        <div className="font-medium text-amber-900 dark:text-amber-100">
                          {bulkStatusInvalidPreview.length} selected row(s) cannot move to this status (will be skipped)
                        </div>
                        <ul className="mt-1 max-h-28 list-inside list-disc space-y-0.5 overflow-y-auto text-muted-foreground">
                          {bulkStatusInvalidPreview.map((row) => (
                            <li key={row.id}>
                              <span className="text-foreground">{row.label}</span> — {row.reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {bulkMode === "append_notes" ? (
                  <div className="space-y-1">
                    <Label>Note to append</Label>
                    <Textarea
                      className="min-h-[88px]"
                      value={bulkAppendNote}
                      onChange={(e) => setBulkAppendNote(e.target.value)}
                      placeholder="Appended with a timestamp on each blade…"
                    />
                  </div>
                ) : null}

                {bulkMode === "knife_type" ? (
                  <div className="space-y-1">
                    <Label>Service / blade type</Label>
                    <Select value={bulkTypeValue || "__pick__"} onValueChange={setBulkTypeValue}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Type" />
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
                ) : null}

                {bulkMode === "line_prices" ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>New unit £ (ex VAT)</Label>
                      <Input className="h-11" inputMode="decimal" value={bulkUnitGbp} onChange={(e) => setBulkUnitGbp(e.target.value)} />
                    </div>
                    <label className="flex cursor-pointer items-start gap-2 text-xs leading-snug">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border border-input"
                        checked={bulkAckPrice}
                        onChange={(e) => setBulkAckPrice(e.target.checked)}
                      />
                      <span>
                        I understand this overwrites the unit price on each selected line, rebuilds order totals, and is audited.
                      </span>
                    </label>
                  </div>
                ) : null}

                {bulkMode === "inspection_visibility" ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>Customer can see inspection notes</Label>
                      <Select
                        value={bulkInspectionVisible ? "yes" : "no"}
                        onValueChange={(v) => setBulkInspectionVisible(v === "yes")}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Visible to customer</SelectItem>
                          <SelectItem value="no">Hidden from customer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <label className="flex cursor-pointer items-start gap-2 text-xs leading-snug">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border border-input"
                        checked={bulkAckVisibility}
                        onChange={(e) => setBulkAckVisibility(e.target.checked)}
                      />
                      <span>I confirm this customer visibility change for inspection notes on the selected blades.</span>
                    </label>
                  </div>
                ) : null}
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setBulkWorkshopOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" size="lg" onClick={requestBulkWorkshopConfirm}>
                  Review &amp; confirm…
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : null}

      <div className="text-base font-semibold">Billable lines</div>
      {(o.items ?? []).length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          No priced lines yet — use <strong className="font-medium text-foreground">Bulk lines (priced)</strong> to add blades with
          unit rates (and optional inventory link per row).
        </p>
      ) : (
        <>
          <div className="mt-3 hidden md:block overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  {canUpdateBladeStatuses ? (
                    <th className="w-10 px-2 py-2">
                      <span className="sr-only">Select for bulk</span>
                    </th>
                  ) : null}
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Unit (ex VAT)</th>
                  <th className="px-3 py-2">Line</th>
                  <th className="px-3 py-2">Blade</th>
                  <th className="px-3 py-2">Service</th>
                </tr>
              </thead>
              <tbody>
                {(o.items ?? []).map((line) => {
                  const lineRow = line as typeof line & {
                    allowed_next_service_statuses?: { value: string; label: string; risky: boolean }[];
                    effective_status?: string | null;
                  };
                  const lineNext = lineRow.allowed_next_service_statuses ?? [];
                  const svc = lineRow.effective_status ?? "";
                  const busyLine = orderItemTransitionMutation.isPending;

                  return (
                    <tr key={line.id} className="border-t">
                      {canUpdateBladeStatuses ? (
                        <td className="px-2 py-2 align-middle">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border border-input"
                            checked={selLineIds.includes(line.id)}
                            onChange={() => toggleSelLine(line.id)}
                            aria-label={`Select line ${line.description}`}
                          />
                        </td>
                      ) : null}
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
                      <td className="max-w-[220px] px-3 py-2 align-top">
                        {svc ? <StatusBadge kind="knife" status={svc} /> : null}
                        {!line.knife_id && canUpdateBladeStatuses && lineNext.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {lineNext.map((step) => (
                              <Button
                                key={step.value}
                                type="button"
                                size="sm"
                                variant={step.risky || isRiskyKnifeTransition(step.value) ? "destructive" : "secondary"}
                                className="h-auto min-h-8 px-2 py-1 text-xs"
                                disabled={busyLine}
                                onClick={() => {
                                  if (step.risky || isRiskyKnifeTransition(step.value)) {
                                    setPendingRiskyBlade({
                                      kind: "line",
                                      itemId: line.id,
                                      target_status: step.value,
                                      label: step.label,
                                    });
                                    setRiskyBladeConfirmOpen(true);
                                    return;
                                  }
                                  orderItemTransitionMutation.mutate({ itemId: line.id, target_status: step.value });
                                }}
                              >
                                {step.label}
                              </Button>
                            ))}
                          </div>
                        ) : null}
                        {line.knife_id ? (
                          <p className="mt-1 text-xs text-muted-foreground">Follow blade card below.</p>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ul className="mt-3 space-y-2 md:hidden">
            {(o.items ?? []).map((line) => {
              const lineRow = line as typeof line & {
                allowed_next_service_statuses?: { value: string; label: string; risky: boolean }[];
                effective_status?: string | null;
              };
              const lineNext = lineRow.allowed_next_service_statuses ?? [];
              const svc = lineRow.effective_status ?? "";
              const busyLine = orderItemTransitionMutation.isPending;

              return (
                <li key={line.id} className="flex gap-3 rounded-lg border bg-muted/20 p-3 text-sm">
                  {canUpdateBladeStatuses ? (
                    <label className="flex min-h-11 min-w-11 shrink-0 cursor-pointer items-start justify-center pt-0.5">
                      <input
                        type="checkbox"
                        className="h-5 w-5 rounded border border-input"
                        checked={selLineIds.includes(line.id)}
                        onChange={() => toggleSelLine(line.id)}
                        aria-label={`Select line ${line.description}`}
                      />
                    </label>
                  ) : null}
                  <div className="min-w-0 flex-1">
                  <div className="font-medium">{line.description}</div>
                  <div className="mt-1 text-muted-foreground">
                    {line.quantity} × {line.formatted_unit_amount ?? formatGBP(line.unit_amount_pence)} ex VAT
                  </div>
                  <div className="mt-1 font-semibold tabular-nums">
                    Line: {line.formatted_line_total ?? formatGBP(line.line_total_pence ?? line.quantity * line.unit_amount_pence)}
                  </div>
                  {svc ? (
                    <div className="mt-2">
                      <StatusBadge kind="knife" status={svc} />
                    </div>
                  ) : null}
                  {!line.knife_id && canUpdateBladeStatuses && lineNext.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {lineNext.map((step) => (
                        <Button
                          key={step.value}
                          type="button"
                          size="sm"
                          variant={step.risky || isRiskyKnifeTransition(step.value) ? "destructive" : "secondary"}
                          className="h-auto min-h-9 px-2 py-1.5 text-xs"
                          disabled={busyLine}
                          onClick={() => {
                            if (step.risky || isRiskyKnifeTransition(step.value)) {
                              setPendingRiskyBlade({
                                kind: "line",
                                itemId: line.id,
                                target_status: step.value,
                                label: step.label,
                              });
                              setRiskyBladeConfirmOpen(true);
                              return;
                            }
                            orderItemTransitionMutation.mutate({ itemId: line.id, target_status: step.value });
                          }}
                        >
                          {step.label}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                  {line.knife_id ? (
                    <Button asChild variant="link" className="mt-1 h-auto px-0 text-base">
                      <Link href={`/admin/knives/${line.knife_id}`}>Blade record</Link>
                    </Button>
                  ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <Separator className="my-6" />

      <div className="text-base font-semibold">Knives on this order</div>
      {(o.knives ?? []).length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No blades registered yet — use bulk or single add above.</p>
      ) : null}
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {(o.knives ?? []).map((k) => {
          const kn = k as typeof k & {
            allowed_next_statuses?: { value: string; label: string; risky: boolean }[];
            photos?: { id: string; caption?: string | null; photo_kind?: string | null }[];
          };
          const photos = kn.photos ?? [];
          const firstPhoto = photos[0];
          const extraPhotos = photos.length > 1 ? photos.length - 1 : 0;
          const nextSteps = kn.allowed_next_statuses ?? [];
          const busyKnife = knifeTransitionMutation.isPending;

          return (
            <Card key={k.id} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  {canUpdateBladeStatuses ? (
                    <label className="flex min-h-10 min-w-10 shrink-0 cursor-pointer items-start justify-center pt-0.5">
                      <input
                        type="checkbox"
                        className="h-5 w-5 rounded border border-input md:h-4 md:w-4"
                        checked={selKnifeIds.includes(k.id)}
                        onChange={() => toggleSelKnife(k.id)}
                        aria-label={`Select blade ${k.tag_id ?? k.id}`}
                      />
                    </label>
                  ) : null}
                  {firstPhoto ? (
                    <div className="relative shrink-0">
                      <AdminOrderKnifePhotoThumb photoId={firstPhoto.id} caption={firstPhoto.caption} />
                      {extraPhotos > 0 ? (
                        <span className="absolute bottom-0 right-0 rounded-tl bg-black/55 px-1 text-[10px] leading-none text-white">
                          +{extraPhotos}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-muted-foreground">{k.tag_id}</div>
                    <div className="truncate font-semibold">
                      {("label" in k && typeof k.label === "string" && k.label) || k.knife_type || "Blade"}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-start gap-2">
                  <AdminKnifeQuickPhotosDialog
                    knifeId={k.id}
                    orderId={orderId}
                    photos={photos.map((p) => ({
                      id: p.id,
                      caption: p.caption,
                      photo_kind: p.photo_kind ?? undefined,
                    }))}
                    canManage={canUpdateBladeStatuses}
                  />
                  <StatusBadge kind="knife" status={k.status ?? ""} />
                </div>
              </div>
              {canUpdateBladeStatuses && nextSteps.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {nextSteps.map((step) => (
                    <Button
                      key={step.value}
                      type="button"
                      size="sm"
                      variant={step.risky || isRiskyKnifeTransition(step.value) ? "destructive" : "secondary"}
                      className="h-auto min-h-9 px-2 py-1.5 text-xs leading-tight"
                      disabled={busyKnife}
                      onClick={() => {
                        if (step.risky || isRiskyKnifeTransition(step.value)) {
                          setPendingRiskyBlade({
                            kind: "knife",
                            knifeId: k.id,
                            target_status: step.value,
                            label: step.label,
                          });
                          setRiskyBladeConfirmOpen(true);
                          return;
                        }
                        knifeTransitionMutation.mutate({ knifeId: k.id, target_status: step.value });
                      }}
                    >
                      {step.label}
                    </Button>
                  ))}
                </div>
              ) : null}
              <Button asChild variant="link" className="mt-2 h-auto px-0 text-base">
                <Link href={`/admin/knives/${k.id}`}>Open full lifecycle</Link>
              </Button>
            </Card>
          );
        })}
      </div>
    </>
  );
}
