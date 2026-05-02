"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ListChecks } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { BookingDetailResponseSchema } from "@/lib/api/admin-bookings-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { formatGBP } from "@/lib/format/money";

import { AuditTimeline, type AuditTimelineRow } from "@/components/admin/AuditTimeline";
import { RouteLookup } from "@/components/admin/lookups/AsyncEntityLookup";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useBackendMe } from "@/hooks/use-backend-me";
import { NotificationHistoryCard } from "@/components/notifications/NotificationHistoryCard";

const notesSchema = z.object({
  internal_notes: z.string().optional(),
});

const assignToRouteSchema = z.object({
  route_id: z.string().min(1, "Choose a route"),
  sequence: z.string().optional(),
  confirmed_collection_date: z.string().optional(),
  confirmed_time_window_start: z.string().optional(),
  confirmed_time_window_end: z.string().optional(),
});

type LifecycleGate =
  | "requested"
  | "confirmed"
  | "assigned_to_route"
  | "collected"
  | "in_sharpening"
  | "quality_checked"
  | "returned"
  | "completed"
  | "converted_to_order"
  | "cancelled"
  | "no_show";

export default function AdminBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId =
    typeof params.bookingId === "string"
      ? params.bookingId
      : Array.isArray(params.bookingId)
        ? params.bookingId[0]
        : "";

  const admin = useAdminApi();
  const qc = useQueryClient();
  const { data: me } = useBackendMe();

  const perms = new Set(me?.data?.permissions ?? []);

  const canCancel = perms.has("bookings.cancel");
  const canUpdateBooking = perms.has("bookings.update");
  const assignRoute = perms.has("bookings.update") && perms.has("routes.manage");
  const convertOrder = perms.has("bookings.update") && perms.has("orders.create");
  const canHardDelete = perms.has("bookings.delete");

  const bookingQuery = useQuery({
    enabled: Boolean(bookingId),
    queryKey: ["admin-booking-detail", bookingId],
    queryFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/bookings/${bookingId}`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = BookingDetailResponseSchema.safeParse(res.data);

      if (!parsed.success) {
        throw new Error("Unexpected booking detail payload.");
      }

      return parsed.data.data;
    },
  });

  const collectionDateForRoute = useMemo(() => {
    const row = bookingQuery.data;
    if (!row) return null;
    return row.confirmed_collection_date ?? row.requested_collection_date ?? row.requested_date ?? null;
  }, [bookingQuery.data]);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [reassignWarnOpen, setReassignWarnOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [unassignOpen, setUnassignOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const confirmExtrasSchema = z.object({
    confirmed_collection_date: z.string().optional(),
    confirmed_time_window_start: z.string().optional(),
    confirmed_time_window_end: z.string().optional(),
  });

  const confirmExtrasForm = useForm<z.infer<typeof confirmExtrasSchema>>({
    resolver: zodResolver(confirmExtrasSchema),
    defaultValues: {},
  });

  const requestedWindowSchema = z.object({
    requested_collection_date: z.string().min(1, "Date required"),
    requested_time_window_start: z.string().optional(),
    requested_time_window_end: z.string().optional(),
  });

  const requestedWindowForm = useForm<z.infer<typeof requestedWindowSchema>>({
    resolver: zodResolver(requestedWindowSchema),
    defaultValues: {
      requested_collection_date: "",
      requested_time_window_start: "",
      requested_time_window_end: "",
    },
  });

  const confirmedWindowSchema = z.object({
    confirmed_collection_date: z.string().min(1, "Date required"),
    confirmed_time_window_start: z.string().min(1, "Start required"),
    confirmed_time_window_end: z.string().min(1, "End required"),
  });

  const confirmedWindowForm = useForm<z.infer<typeof confirmedWindowSchema>>({
    resolver: zodResolver(confirmedWindowSchema),
    defaultValues: {
      confirmed_collection_date: "",
      confirmed_time_window_start: "",
      confirmed_time_window_end: "",
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (body: Record<string, string>) => {
      const res = await admin.json(`/api/admin/bookings/${bookingId}/confirm`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }

      return res.data;
    },
    onSuccess: async () => {
      toast.success("Booking confirmed.");
      await qc.invalidateQueries({ queryKey: ["admin-booking-detail", bookingId] });
      await qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Confirm failed.");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await admin.json(`/api/admin/bookings/${bookingId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() || null }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }

      return res.data;
    },
    onSuccess: async () => {
      toast.success("Booking cancelled.");
      setCancelOpen(false);
      setCancelReason("");
      await qc.invalidateQueries({ queryKey: ["admin-booking-detail", bookingId] });
      await qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Cancel failed.");
    },
  });

  const openAssignDialog = () => {
    const row = bookingQuery.data;
    if (row?.assigned_route_id) {
      setReassignWarnOpen(true);
    } else {
      setAssignOpen(true);
    }
  };

  const assignForm = useForm<z.infer<typeof assignToRouteSchema>>({
    resolver: zodResolver(assignToRouteSchema),
    defaultValues: {
      route_id: "",
      sequence: "",
      confirmed_collection_date: "",
      confirmed_time_window_start: "",
      confirmed_time_window_end: "",
    },
  });

  useEffect(() => {
    if (!assignOpen) return;
    const row = bookingQuery.data;
    if (!row) return;
    assignForm.reset({
      route_id: "",
      sequence: "",
      confirmed_collection_date:
        row.confirmed_collection_date ?? row.requested_collection_date ?? row.requested_date ?? "",
      confirmed_time_window_start: (row.confirmed_time_window_start ?? "").slice(0, 5),
      confirmed_time_window_end: (row.confirmed_time_window_end ?? "").slice(0, 5),
    });
  }, [assignOpen, bookingQuery.data, assignForm]);

  useEffect(() => {
    const row = bookingQuery.data;
    if (!row) return;
    requestedWindowForm.reset({
      requested_collection_date:
        row.requested_collection_date ?? row.requested_date ?? "",
      requested_time_window_start: (
        row.requested_time_window_start ??
        row.time_window_start ??
        ""
      ).slice(0, 5),
      requested_time_window_end: (row.requested_time_window_end ?? row.time_window_end ?? "").slice(0, 5),
    });
  }, [bookingQuery.data, requestedWindowForm]);

  const saveRequestedWindow = useMutation({
    mutationFn: async (values: z.infer<typeof requestedWindowSchema>) => {
      const body: Record<string, string | null> = {
        requested_collection_date: values.requested_collection_date,
        requested_time_window_start: values.requested_time_window_start?.trim()
          ? values.requested_time_window_start.trim().slice(0, 5)
          : null,
        requested_time_window_end: values.requested_time_window_end?.trim()
          ? values.requested_time_window_end.trim().slice(0, 5)
          : null,
      };
      const res = await admin.json(`/api/admin/bookings/${bookingId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Requested window updated.");
      await qc.invalidateQueries({ queryKey: ["admin-booking-detail", bookingId] });
      await qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Update failed.");
    },
  });

  const saveConfirmedWindow = useMutation({
    mutationFn: async (values: z.infer<typeof confirmedWindowSchema>) => {
      const res = await admin.json(`/api/admin/bookings/${bookingId}`, {
        method: "PUT",
        body: JSON.stringify({
          confirmed_collection_date: values.confirmed_collection_date,
          confirmed_time_window_start: values.confirmed_time_window_start,
          confirmed_time_window_end: values.confirmed_time_window_end,
        }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Confirmed window updated.");
      await qc.invalidateQueries({ queryKey: ["admin-booking-detail", bookingId] });
      await qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Update failed.");
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (payload: z.infer<typeof assignToRouteSchema>) => {
      const body: Record<string, unknown> = { route_id: payload.route_id };
      if (payload.sequence?.trim()) {
        const n = parseInt(payload.sequence.trim(), 10);
        if (!Number.isNaN(n) && n > 0) {
          body.sequence = n;
        }
      }
      if (payload.confirmed_collection_date?.trim()) {
        body.confirmed_collection_date = payload.confirmed_collection_date.trim();
      }
      if (payload.confirmed_time_window_start?.trim()) {
        body.confirmed_time_window_start = payload.confirmed_time_window_start.trim().slice(0, 5);
      }
      if (payload.confirmed_time_window_end?.trim()) {
        body.confirmed_time_window_end = payload.confirmed_time_window_end.trim().slice(0, 5);
      }

      const res = await admin.json(`/api/admin/bookings/${bookingId}/assign-route`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }

      return res.data;
    },
    onSuccess: async (_data, vars) => {
      toast.success("Route assigned.");
      setAssignOpen(false);
      assignForm.reset({
        route_id: "",
        sequence: "",
        confirmed_collection_date: "",
        confirmed_time_window_start: "",
        confirmed_time_window_end: "",
      });
      await qc.invalidateQueries({ queryKey: ["admin-booking-detail", bookingId] });
      await qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      await qc.invalidateQueries({ queryKey: ["admin-routes-list"] });
      await qc.invalidateQueries({ queryKey: ["admin-routes-today"] });
      await qc.invalidateQueries({ queryKey: ["admin-route-detail", vars.route_id] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Assign route failed.");
    },
  });

  const unassignMutation = useMutation({
    mutationFn: async () => {
      const res = await admin.json(`/api/admin/bookings/${bookingId}/unassign-route`, { method: "POST" });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Booking removed from route.");
      setUnassignOpen(false);
      await qc.invalidateQueries({ queryKey: ["admin-booking-detail", bookingId] });
      await qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Unassign failed.");
    },
  });

  const routePlaceholderMutation = useMutation({
    mutationFn: async () => {
      const res = await admin.json(`/api/admin/bookings/${bookingId}/create-route-placeholder`, { method: "POST" });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.message("Logged — create the run from Routes for now.");
      await qc.invalidateQueries({ queryKey: ["admin-booking-detail", bookingId] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Request failed.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await admin.json(`/api/admin/bookings/${bookingId}`, { method: "DELETE" });
      if (!res.ok) {
        const raw = res.payload as { error?: { message?: string; details?: { blockers?: string[] } } } | null;
        const blockers = raw?.error?.details?.blockers;
        const msg = raw?.error?.message ?? res.message;
        const suffix = blockers?.length ? ` Blocked by: ${blockers.join(", ")}.` : "";
        throw new Error(`${msg}${suffix}`);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Booking deleted.");
      setDeleteOpen(false);
      await qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      router.push("/admin/bookings");
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Delete failed.");
    },
  });

  const convertMutation = useMutation({
    mutationFn: async () => {
      const res = await admin.json(`/api/admin/bookings/${bookingId}/convert-to-order`, { method: "POST" });
      if (!res.ok) {
        throw new Error(res.message);
      }

      return res.data;
    },
    onSuccess: async (payload: unknown) => {
      toast.success("Draft order created.");
      setConvertOpen(false);
      const env = payload as { data?: { order_id?: string } };
      const oid = env?.data?.order_id;
      if (oid) {
        router.push(`/admin/orders/${oid}`);
      }
      await qc.invalidateQueries({ queryKey: ["admin-booking-detail", bookingId] });
      await qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Conversion failed.");
    },
  });

  const notesForm = useForm<z.infer<typeof notesSchema>>({
    resolver: zodResolver(notesSchema),
    defaultValues: { internal_notes: "" },
  });

  useEffect(() => {
    if (bookingQuery.data?.internal_notes !== undefined) {
      notesForm.reset({ internal_notes: bookingQuery.data.internal_notes ?? "" });
    }
  }, [bookingQuery.data?.internal_notes, notesForm]);

  useEffect(() => {
    const row = bookingQuery.data;
    if (!row || row.status !== "requested") return;
    confirmExtrasForm.reset({
      confirmed_collection_date:
        row.confirmed_collection_date ?? row.requested_collection_date ?? row.requested_date ?? "",
      confirmed_time_window_start: (
        row.confirmed_time_window_start ??
        row.requested_time_window_start ??
        row.time_window_start ??
        ""
      ).slice(0, 5),
      confirmed_time_window_end: (
        row.confirmed_time_window_end ?? row.requested_time_window_end ?? row.time_window_end ?? ""
      ).slice(0, 5),
    });
  }, [bookingQuery.data, confirmExtrasForm]);

  // Sync confirmed-window editor when booking loads / server updates those fields.
  useEffect(() => {
    const row = bookingQuery.data;
    if (!row) return;
    confirmedWindowForm.reset({
      confirmed_collection_date:
        row.confirmed_collection_date ?? row.requested_collection_date ?? row.requested_date ?? "",
      confirmed_time_window_start: (row.confirmed_time_window_start ?? "").slice(0, 5),
      confirmed_time_window_end: (row.confirmed_time_window_end ?? "").slice(0, 5),
    });
  }, [bookingQuery.data, confirmedWindowForm]);

  const saveNotes = useMutation({
    mutationFn: async (values: z.infer<typeof notesSchema>) => {
      const res = await admin.json(`/api/admin/bookings/${bookingId}`, {
        method: "PUT",
        body: JSON.stringify({ internal_notes: values.internal_notes ?? "" }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }

      return res.data;
    },
    onSuccess: async () => {
      toast.success("Internal notes saved.");
      await qc.invalidateQueries({ queryKey: ["admin-booking-detail", bookingId] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    },
  });

  const b = bookingQuery.data;

  const statusKey = (b?.status ?? "requested") as LifecycleGate | string;

  const canConfirm = statusKey === "requested";
  const canCancelNow =
    canCancel &&
    ["requested", "confirmed", "assigned_to_route", "collected", "in_sharpening", "quality_checked"].includes(statusKey);

  const canAssignNow =
    assignRoute &&
    (statusKey === "confirmed" || statusKey === "assigned_to_route") &&
    Boolean(collectionDateForRoute);

  const canConvertNow =
    convertOrder &&
    statusKey !== "converted_to_order" &&
    !b?.orders.length &&
    (statusKey === "confirmed" || statusKey === "assigned_to_route" || statusKey === "collected");

  const canUnassignNow = assignRoute && statusKey === "assigned_to_route";

  const showHardDelete =
    canHardDelete &&
    statusKey === "requested" &&
    (b?.orders?.length ?? 0) === 0 &&
    !b?.assigned_route_id &&
    !b?.route_stop;

  if (!bookingId) {
    return <div className="text-sm text-muted-foreground">Invalid booking id.</div>;
  }

  if (bookingQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading booking…
      </div>
    );
  }

  if (bookingQuery.isError || !b) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {bookingQuery.error instanceof Error ? bookingQuery.error.message : "Unable to load booking."}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: "Bookings", href: "/admin/bookings" },
          { label: b.reference?.trim() ? b.reference : (b.company?.name ?? "Booking") },
        ]}
      />
      <PageHeader
        title={b.reference ?? "Booking"}
        description={`${b.company?.name ?? "Account"} · collection ${collectionDateForRoute ?? b.requested_date ?? "—"} · ${b.service_type}`}
        titleRowEnd={
          <>
            <StatusBadge kind="booking" status={b.status} className="text-xs" />
            <Button
              type="button"
              variant="outline"
              disabled={!canConfirm || !canUpdateBooking || confirmMutation.isPending}
              onClick={() => {
                const extras = confirmExtrasForm.getValues();
                const body: Record<string, string> = {};
                if (extras.confirmed_collection_date?.trim()) {
                  body.confirmed_collection_date = extras.confirmed_collection_date.trim();
                }
                if (extras.confirmed_time_window_start?.trim()) {
                  body.confirmed_time_window_start = extras.confirmed_time_window_start.trim().slice(0, 5);
                }
                if (extras.confirmed_time_window_end?.trim()) {
                  body.confirmed_time_window_end = extras.confirmed_time_window_end.trim().slice(0, 5);
                }
                confirmMutation.mutate(body);
              }}
            >
              Confirm
            </Button>
            <Button type="button" variant="destructive" disabled={!canCancelNow} onClick={() => setCancelOpen(true)}>
              Cancel
            </Button>
            <Button type="button" variant="secondary" disabled={!canAssignNow} onClick={openAssignDialog}>
              Assign to route
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canUnassignNow || unassignMutation.isPending}
              onClick={() => setUnassignOpen(true)}
            >
              Remove from route
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!assignRoute || routePlaceholderMutation.isPending}
              onClick={() => routePlaceholderMutation.mutate()}
            >
              New route (placeholder)
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!canConvertNow || convertMutation.isPending}
              onClick={() => setConvertOpen(true)}
            >
              Convert to order
            </Button>
            {showHardDelete ? (
              <Button type="button" variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                Delete booking
              </Button>
            ) : null}
          </>
        }
        actions={
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/admin/bookings">Back to list</Link>
          </Button>
        }
      />

      {b.staff_next_actions && b.staff_next_actions.length > 0 ? (
        <Alert className="border-primary/25 bg-primary/5">
          <ListChecks className="h-4 w-4" aria-hidden />
          <AlertTitle>Next steps</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-inside list-disc space-y-1">
              {b.staff_next_actions.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      {canConfirm && canUpdateBooking ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Confirm with arrival window (optional)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="confirm-day">Confirmed date</Label>
              <Input id="confirm-day" type="date" {...confirmExtrasForm.register("confirmed_collection_date")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-start">Window start</Label>
              <Input id="confirm-start" type="time" {...confirmExtrasForm.register("confirmed_time_window_start")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-end">Window end</Label>
              <Input id="confirm-end" type="time" {...confirmExtrasForm.register("confirmed_time_window_end")} />
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-3">
              Leave blank to copy the customer&apos;s requested date and window. You can adjust the confirmed window later below.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {assignRoute && (statusKey === "confirmed" || statusKey === "assigned_to_route") && collectionDateForRoute ? (
        <p className="text-xs text-muted-foreground">
          If nothing appears when assigning, create a driver run for{" "}
          <strong className="text-foreground">{collectionDateForRoute}</strong> under{" "}
          <Link className="font-medium text-primary underline underline-offset-2" href="/admin/routes">
            Routes
          </Link>
          .
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer / account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="font-medium">{b.company?.name ?? "—"}</div>
            {b.company?.id ? (
              <Link className="text-xs text-primary underline underline-offset-2" href={`/admin/crm/${b.company.id}`}>
                View CRM profile
              </Link>
            ) : null}
            <div className="text-muted-foreground">{b.company?.city ?? "—"}</div>
            <div className="text-muted-foreground">{b.company?.billing_email ?? "—"}</div>
            <div className="text-muted-foreground">{b.company?.phone ?? "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Location & contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <div className="font-medium">{b.location?.label ?? "Site"}</div>
              <div className="text-muted-foreground">
                {[b.location?.line_one, b.location?.line_two, b.location?.city, b.location?.postcode]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </div>
            </div>
            <Separator />
            <div>
              {b.contact ? (
                <>
                  <div className="font-medium">
                    {b.contact.first_name} {b.contact.last_name}
                  </div>
                  <div className="text-muted-foreground">{b.contact.email ?? "—"}</div>
                  <div className="text-muted-foreground">{b.contact.phone ?? "—"}</div>
                </>
              ) : (
                <span className="text-muted-foreground">No contact linked.</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {canUpdateBooking && !["cancelled", "converted_to_order", "completed", "no_show"].includes(statusKey) ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer-requested window</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3 text-sm sm:grid-cols-3"
              onSubmit={requestedWindowForm.handleSubmit((values) => saveRequestedWindow.mutate(values))}
            >
              <div className="space-y-2">
                <Label htmlFor="req-day">Requested date</Label>
                <Input id="req-day" type="date" {...requestedWindowForm.register("requested_collection_date")} />
                {requestedWindowForm.formState.errors.requested_collection_date ? (
                  <p className="text-xs text-destructive">
                    {requestedWindowForm.formState.errors.requested_collection_date.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="req-start">Window start</Label>
                <Input id="req-start" type="time" {...requestedWindowForm.register("requested_time_window_start")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="req-end">Window end</Label>
                <Input id="req-end" type="time" {...requestedWindowForm.register("requested_time_window_end")} />
              </div>
              <div className="sm:col-span-3">
                <Button type="submit" size="sm" disabled={saveRequestedWindow.isPending}>
                  {saveRequestedWindow.isPending ? "Saving…" : "Save requested window"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ops detail</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <div className="text-xs text-muted-foreground">Service</div>
            <div className="capitalize">{b.service_type}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Requested collection</div>
            <div>
              {(b.requested_collection_date ?? b.requested_date) ?? "—"} · {(b.requested_time_window_start ?? b.time_window_start) ?? "—"} →{" "}
              {(b.requested_time_window_end ?? b.time_window_end) ?? "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Confirmed collection</div>
            <div>
              {b.confirmed_collection_date ?? "—"} · {b.confirmed_time_window_start ?? "—"} → {b.confirmed_time_window_end ?? "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Knives (est / actual)</div>
            <div>
              {b.estimated_knife_count ?? "—"} / {b.actual_knife_count ?? "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Price estimate</div>
            <div className="tabular-nums">
              {b.price_estimate != null ? formatGBP(b.price_estimate) : "—"}
            </div>
          </div>
          <div className="sm:col-span-2">
            <div className="text-xs text-muted-foreground">Customer notes</div>
            <div className="whitespace-pre-wrap">{b.customer_notes ?? "—"}</div>
          </div>
        </CardContent>
      </Card>

      {canUpdateBooking && !["cancelled", "converted_to_order", "completed", "no_show"].includes(statusKey) ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit confirmed collection window</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3 text-sm sm:grid-cols-3"
              onSubmit={confirmedWindowForm.handleSubmit((values) => saveConfirmedWindow.mutate(values))}
            >
              <div className="space-y-2">
                <Label htmlFor="edit-conf-day">Confirmed date</Label>
                <Input id="edit-conf-day" type="date" {...confirmedWindowForm.register("confirmed_collection_date")} />
                {confirmedWindowForm.formState.errors.confirmed_collection_date ? (
                  <p className="text-xs text-destructive">{confirmedWindowForm.formState.errors.confirmed_collection_date.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-conf-start">Window start</Label>
                <Input id="edit-conf-start" type="time" {...confirmedWindowForm.register("confirmed_time_window_start")} />
                {confirmedWindowForm.formState.errors.confirmed_time_window_start ? (
                  <p className="text-xs text-destructive">{confirmedWindowForm.formState.errors.confirmed_time_window_start.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-conf-end">Window end</Label>
                <Input id="edit-conf-end" type="time" {...confirmedWindowForm.register("confirmed_time_window_end")} />
                {confirmedWindowForm.formState.errors.confirmed_time_window_end ? (
                  <p className="text-xs text-destructive">{confirmedWindowForm.formState.errors.confirmed_time_window_end.message}</p>
                ) : null}
              </div>
              <div className="sm:col-span-3">
                <Button type="submit" size="sm" disabled={saveConfirmedWindow.isPending}>
                  {saveConfirmedWindow.isPending ? "Saving…" : "Save confirmed window"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Internal notes</CardTitle>
        </CardHeader>
        <CardContent>
          {canUpdateBooking ? (
            <form
              className="space-y-3"
              onSubmit={notesForm.handleSubmit((values) => {
                saveNotes.mutate(values);
              })}
            >
              <Textarea rows={5} {...notesForm.register("internal_notes")} />
              <Button type="submit" size="sm" disabled={saveNotes.isPending}>
                {saveNotes.isPending ? "Saving…" : "Save internal notes"}
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">You do not have permission to edit internal notes.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Route & orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Assigned route: </span>
            {b.assigned_route ? (
              <Link
                href={`/admin/routes/${b.assigned_route.id}`}
                className="font-medium text-primary underline underline-offset-2"
              >
                {b.assigned_route.name} ({b.assigned_route.scheduled_date})
              </Link>
            ) : (
              "—"
            )}
          </div>
          <div>
            <span className="text-muted-foreground">Stop: </span>
            {b.route_stop ? `#${b.route_stop.sequence ?? "?"} · ${b.route_stop.route_stop_status ?? ""}` : "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Orders: </span>
            {b.orders.length === 0 ? (
              "None yet"
            ) : (
              <ul className="mt-1 space-y-1">
                {b.orders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/orders/${o.id}`} className="text-sm font-medium text-primary underline underline-offset-2">
                      {o.order_status?.replace(/_/g, " ") ?? "Order"} · {formatGBP(o.total_pence)}
                      {o.currency ? ` ${o.currency}` : ""}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity &amp; audit</CardTitle>
        </CardHeader>
        <CardContent>
          <AuditTimeline items={(b.audit_timeline ?? b.status_timeline) as AuditTimelineRow[]} showPayload />
        </CardContent>
      </Card>

      <NotificationHistoryCard scopeLabel="this booking" fetchPath={`/api/admin/bookings/${bookingId}/notifications`} />

      <AlertDialog open={unassignOpen} onOpenChange={setUnassignOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this booking from its route?</AlertDialogTitle>
            <AlertDialogDescription>
              The booking returns to confirmed status. Only allowed when the route stop has not started yet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <Button type="button" disabled={unassignMutation.isPending} onClick={() => unassignMutation.mutate()}>
              {unassignMutation.isPending ? "Removing…" : "Remove from route"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Only safe for draft requested bookings with no route, orders, or knives. Otherwise cancel the booking instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete permanently"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This records a cancellation in the audit trail. Field routes may need manual cleanup if already scheduled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 px-1 py-2">
            <Label htmlFor="cancel-note">Reason (optional)</Label>
            <Textarea
              id="cancel-note"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Short note for the audit log…"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate(cancelReason)}
            >
              {cancelMutation.isPending ? "Cancelling…" : "Confirm cancel"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reassignWarnOpen} onOpenChange={setReassignWarnOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move route assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              This booking already has a route. Assigning another run moves the stop and is logged — confirm before continuing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <Button
              type="button"
              onClick={() => {
                setReassignWarnOpen(false);
                setAssignOpen(true);
              }}
            >
              Choose new route
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={convertOpen} onOpenChange={setConvertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert to order?</AlertDialogTitle>
            <AlertDialogDescription>
              Creates a draft order linked to this booking. The booking is marked converted — you can add knives and continue in the order workflow.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <Button type="button" disabled={convertMutation.isPending} onClick={() => convertMutation.mutate()}>
              {convertMutation.isPending ? "Creating…" : "Create draft order"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to route · {collectionDateForRoute ?? "—"}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={assignForm.handleSubmit((v) => assignMutation.mutate(v))}
          >
            <RouteLookup
              label="Route run"
              value={assignForm.watch("route_id") === "" ? null : assignForm.watch("route_id")}
              onChange={(id) => assignForm.setValue("route_id", id ?? "", { shouldValidate: true })}
              extraParams={collectionDateForRoute ? { date: collectionDateForRoute } : undefined}
              placeholder={
                collectionDateForRoute
                  ? "Search routes for this date…"
                  : "Set a collection date on the booking first"
              }
              disabled={!collectionDateForRoute}
            />
            {assignForm.formState.errors.route_id ? (
              <p className="text-xs text-destructive">{assignForm.formState.errors.route_id.message}</p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="assign-seq">Stop sequence (optional)</Label>
                <Input
                  id="assign-seq"
                  inputMode="numeric"
                  placeholder="e.g. 2 — leave blank for end of run"
                  {...assignForm.register("sequence")}
                />
              </div>
              <div className="space-y-2 sm:col-span-2 md:col-span-1">
                <Label htmlFor="assign-conf-day">Confirm collection date (optional)</Label>
                <Input id="assign-conf-day" type="date" {...assignForm.register("confirmed_collection_date")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assign-conf-start">Confirmed window start</Label>
                <Input id="assign-conf-start" type="time" {...assignForm.register("confirmed_time_window_start")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assign-conf-end">Confirmed window end</Label>
                <Input id="assign-conf-end" type="time" {...assignForm.register("confirmed_time_window_end")} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Date must match the route run. Updating the confirmed window here saves it on Assignment — customers see it in the portal.
            </p>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setAssignOpen(false)}>
                Close
              </Button>
              <Button type="submit" disabled={assignMutation.isPending || !assignForm.watch("route_id")}>
                {assignMutation.isPending ? "Assigning…" : "Assign"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
