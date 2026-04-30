"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { BookingDetailResponseSchema } from "@/lib/api/admin-bookings-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { formatGbpFromPence } from "@/lib/format/money";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBackendMe } from "@/hooks/use-backend-me";

const routesPickSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(
      z.object({
        id: z.string(),
        name: z.string().nullable(),
        route_status: z.string().nullable(),
        scheduled_date: z.string().nullable(),
        driver_name: z.string().nullable().optional(),
      }),
    ),
  }),
});

const notesSchema = z.object({
  internal_notes: z.string().optional(),
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
  | "cancelled"
  | "no_show";

export default function AdminBookingDetailPage() {
  const params = useParams();
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

  const routesQuery = useQuery({
    enabled: Boolean(bookingQuery.data?.requested_date),
    queryKey: ["admin-routes-pick", bookingQuery.data?.requested_date],
    queryFn: async () => {
      const d = bookingQuery.data?.requested_date;
      const qs = d ? `?date=${encodeURIComponent(d)}` : "";
      const res = await admin.json<unknown>(`/api/admin/routes${qs}`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = routesPickSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected routes picker response.");
      }
      return parsed.data.data.items;
    },
  });

  const [cancelOpen, setCancelOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const res = await admin.json(`/api/admin/bookings/${bookingId}/confirm`, { method: "POST" });
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
    mutationFn: async () => {
      const res = await admin.json(`/api/admin/bookings/${bookingId}/cancel`, { method: "POST" });
      if (!res.ok) {
        throw new Error(res.message);
      }

      return res.data;
    },
    onSuccess: async () => {
      toast.success("Booking cancelled.");
      setCancelOpen(false);
      await qc.invalidateQueries({ queryKey: ["admin-booking-detail", bookingId] });
      await qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Cancel failed.");
    },
  });

  const assignForm = useForm<{ route_id: string }>({
    defaultValues: { route_id: "" },
  });

  const assignMutation = useMutation({
    mutationFn: async (payload: { route_id: string }) => {
      const res = await admin.json(`/api/admin/bookings/${bookingId}/assign-route`, {
        method: "POST",
        body: JSON.stringify({ route_id: payload.route_id }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }

      return res.data;
    },
    onSuccess: async () => {
      toast.success("Route assigned.");
      setAssignOpen(false);
      assignForm.reset({ route_id: "" });
      await qc.invalidateQueries({ queryKey: ["admin-booking-detail", bookingId] });
      await qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Assign route failed.");
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
    onSuccess: async () => {
      toast.success("Draft order created.");
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
    routesQuery.isSuccess &&
    (routesQuery.data?.length ?? 0) > 0;

  const canConvertNow =
    convertOrder &&
    !b?.orders.length &&
    (statusKey === "confirmed" || statusKey === "assigned_to_route" || statusKey === "collected");

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
      <Breadcrumbs items={[{ label: "Bookings", href: "/admin/bookings" }, { label: b.id.slice(0, 8) }]} />
      <PageHeader
        title={`Booking`}
        description={`Requested ${b.requested_date ?? "—"} · ${b.service_type}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/admin/bookings">Back to list</Link>
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md border px-3 py-1 text-sm capitalize">{b.status.replace(/_/g, " ")}</span>
        <Button type="button" variant="outline" disabled={!canConfirm || !canUpdateBooking || confirmMutation.isPending} onClick={() => confirmMutation.mutate()}>
          Confirm
        </Button>
        <Button type="button" variant="destructive" disabled={!canCancelNow} onClick={() => setCancelOpen(true)}>
          Cancel
        </Button>
        <Button type="button" variant="secondary" disabled={!canAssignNow} onClick={() => setAssignOpen(true)}>
          Assign to route
        </Button>
        <Button type="button" variant="secondary" disabled={!canConvertNow || convertMutation.isPending} onClick={() => convertMutation.mutate()}>
          Convert to order
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer / account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="font-medium">{b.company?.name ?? "—"}</div>
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
            <div className="text-xs text-muted-foreground">Windows</div>
            <div>
              {b.time_window_start ?? "—"} → {b.time_window_end ?? "—"}
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
              {b.price_estimate != null ? formatGbpFromPence(b.price_estimate) : "—"}
            </div>
          </div>
          <div className="sm:col-span-2">
            <div className="text-xs text-muted-foreground">Customer notes</div>
            <div className="whitespace-pre-wrap">{b.customer_notes ?? "—"}</div>
          </div>
        </CardContent>
      </Card>

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
              <span>
                {b.assigned_route.name} ({b.assigned_route.scheduled_date})
              </span>
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
                  <li key={o.id} className="font-mono text-xs">
                    {o.id.slice(0, 8)} · {o.order_status} · {formatGbpFromPence(o.total_pence)} {o.currency}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {b.status_timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit entries yet.</p>
          ) : (
            <ul className="max-h-[480px] space-y-2 overflow-auto text-sm">
              {b.status_timeline.map((row) => (
                <li key={row.id} className="rounded-md border px-3 py-2">
                  <div className="text-xs text-muted-foreground">{row.at ?? ""}</div>
                  <div className="font-medium">{row.action}</div>
                  <div className="text-xs text-muted-foreground">{row.actor_name ?? "—"}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This records a cancellation in the audit trail. Field routes may need manual cleanup if already scheduled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              {cancelMutation.isPending ? "Cancelling…" : "Confirm cancel"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to route ({b.requested_date})</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={assignForm.handleSubmit((v) => assignMutation.mutate({ route_id: v.route_id }))}
          >
            <Label>Route run</Label>
            {routesQuery.isLoading ? (
              <div className="flex gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading routes…
              </div>
            ) : routesQuery.isError ? (
              <p className="text-sm text-destructive">Unable to load routes for this date.</p>
            ) : (
              <Select
                value={assignForm.watch("route_id")}
                onValueChange={(v) => assignForm.setValue("route_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick operational route" />
                </SelectTrigger>
                <SelectContent>
                  {(routesQuery.data ?? []).map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name ?? r.id.slice(0, 8)} · {r.scheduled_date} {r.driver_name ? `· ${r.driver_name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
