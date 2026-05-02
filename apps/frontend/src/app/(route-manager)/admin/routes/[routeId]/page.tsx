"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, ExternalLink, Loader2, Search, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  RouteCompletionSummaryResponseSchema,
  RouteDetailResponseSchema,
  RouteDriversLookupResponseSchema,
} from "@/lib/api/admin-routes-schema";
import { PaginatedBookingsResponseSchema } from "@/lib/api/admin-bookings-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { useBackendMe } from "@/hooks/use-backend-me";

import { AuditTimeline, type AuditTimelineRow } from "@/components/admin/AuditTimeline";
import { RouteManagerShell } from "@/components/layout/RouteManagerShell";
import { MobileNextStopBanner } from "@/components/route-manager/MobileNextStopBanner";
import { MobileRouteProgress } from "@/components/route-manager/MobileRouteProgress";
import { StatusBadge } from "@/components/status/StatusBadge";
import { firstOpenStop } from "@/lib/route-manager/route-stop-helpers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

function formatConfirmedWindow(start?: string | null, end?: string | null): string | null {
  if (!start && !end) {
    return null;
  }
  const f = (s: string) => (s.length >= 5 ? s.slice(0, 5) : s);
  return `${start ? f(start) : "?"}–${end ? f(end) : "?"}`;
}

function moveIds(ids: string[], index: number, dir: -1 | 1): string[] {
  const j = index + dir;
  if (j < 0 || j >= ids.length) {
    return ids;
  }
  const next = [...ids];
  [next[index], next[j]] = [next[j], next[index]];
  return next;
}

export default function RouteDetailPage() {
  const params = useParams<{ routeId: string }>();
  const routeId = params.routeId;
  const admin = useAdminApi();
  const queryClient = useQueryClient();
  const { data: me } = useBackendMe();
  const canManageRoutes = useMemo(
    () => new Set(me?.data?.permissions ?? []).has("routes.manage"),
    [me?.data?.permissions],
  );

  const detailQuery = useQuery({
    queryKey: ["admin-route-detail", routeId],
    enabled: Boolean(routeId),
    queryFn: async () => {
      const res = await admin.json(`/api/admin/routes/${routeId}`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = RouteDetailResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected route detail payload.");
      }
      return parsed.data.data;
    },
  });

  const driversQuery = useQuery({
    queryKey: ["admin-route-drivers-lookup"],
    enabled: canManageRoutes,
    queryFn: async () => {
      const res = await admin.json("/api/admin/lookups/route-drivers?q=");
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = RouteDriversLookupResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected driver lookup.");
      }
      return parsed.data.data.items;
    },
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDriverId, setEditDriverId] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [bookingSearch, setBookingSearch] = useState("");
  const [completeOpen, setCompleteOpen] = useState(false);
  const [forceOverride, setForceOverride] = useState(false);

  const route = detailQuery.data;

  const openEditDialog = () => {
    if (!detailQuery.data) {
      return;
    }
    const r = detailQuery.data;
    setEditName(r.name);
    setEditDate(r.scheduled_date ?? "");
    setEditCity(r.coverage_city ?? "");
    setEditNotes(r.notes ?? "");
    setEditDriverId(r.assigned_staff?.id ?? "");
    setEditOpen(true);
  };

  const bookingsCandidatesQuery = useQuery({
    queryKey: ["admin-route-booking-candidates", routeId, route?.scheduled_date, bookingSearch],
    enabled: Boolean(addOpen && canManageRoutes && route?.scheduled_date),
    queryFn: async () => {
      const qs = new URLSearchParams({
        per_page: "25",
        page: "1",
        status: "confirmed",
        route_assigned: "unassigned",
        date: route!.scheduled_date!,
      });
      const q = bookingSearch.trim();
      if (q) {
        qs.set("q", q);
      }
      const res = await admin.json(`/api/admin/bookings?${qs.toString()}`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = PaginatedBookingsResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected bookings list.");
      }
      return parsed.data.data.items;
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (forceComplete: boolean) => {
      const res = await admin.json<unknown>(`/api/admin/routes/${routeId}/complete`, {
        method: "POST",
        body: JSON.stringify({ force_complete: forceComplete }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = RouteDetailResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected complete-route response.");
      }
      return parsed.data.data;
    },
    onSuccess: () => {
      toast.success("Route marked completed.");
      setCompleteOpen(false);
      setForceOverride(false);
      void queryClient.invalidateQueries({ queryKey: ["admin-route-detail", routeId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-routes-today"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-routes-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const completionSummaryQuery = useQuery({
    queryKey: ["admin-route-completion-summary", routeId],
    enabled: Boolean(routeId) && completeOpen,
    queryFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/routes/${routeId}/completion-summary`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = RouteCompletionSummaryResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected completion summary.");
      }
      return parsed.data.data;
    },
  });

  const saveRouteMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        name: editName.trim(),
        scheduled_date: editDate,
        coverage_city: editCity.trim() || null,
        notes: editNotes.trim() || null,
      };
      if (editDriverId.trim() === "") {
        body.driver_user_id = null;
      } else {
        body.driver_user_id = Number(editDriverId);
      }
      const res = await admin.json(`/api/admin/routes/${routeId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = RouteDetailResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected route update response.");
      }
      return parsed.data.data;
    },
    onSuccess: () => {
      toast.success("Route updated.");
      setEditOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["admin-route-detail", routeId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-routes-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addStopMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await admin.json(`/api/admin/routes/${routeId}/stops`, {
        method: "POST",
        body: JSON.stringify({ booking_id: bookingId }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res;
    },
    onSuccess: async () => {
      toast.success("Booking added to route.");
      await queryClient.invalidateQueries({ queryKey: ["admin-route-detail", routeId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-routes-list"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-route-booking-candidates", routeId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeStopMutation = useMutation({
    mutationFn: async (stopId: string) => {
      const res = await admin.json(`/api/admin/routes/${routeId}/stops/${stopId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = RouteDetailResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected route after remove.");
      }
      return parsed.data.data;
    },
    onSuccess: async () => {
      toast.success("Stop removed from plan.");
      await queryClient.invalidateQueries({ queryKey: ["admin-route-detail", routeId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-routes-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorderMutation = useMutation({
    mutationFn: async (stopIdsInOrder: string[]) => {
      const res = await admin.json(`/api/admin/routes/${routeId}/reorder-stops`, {
        method: "PUT",
        body: JSON.stringify({ stop_ids: stopIdsInOrder }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = RouteDetailResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected reorder response.");
      }
      return parsed.data.data;
    },
    onSuccess: async () => {
      toast.success("Stop order saved.");
      await queryClient.invalidateQueries({ queryKey: ["admin-route-detail", routeId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (detailQuery.status === "pending") {
    return (
      <RouteManagerShell title="Route">
        <div className="flex min-h-[40vh] justify-center pt-16 text-slate-400 md:text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        </div>
      </RouteManagerShell>
    );
  }

  if (detailQuery.status === "error") {
    return (
      <RouteManagerShell title="Route">
        <p className="text-sm text-red-300 md:text-destructive">{(detailQuery.error as Error).message}</p>
      </RouteManagerShell>
    );
  }

  if (!route) {
    return null;
  }

  const { completed, total } = route.progress;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const canComplete = route.route_status === "in_progress";
  const stopIdsOrdered = route.stops.map((s) => s.id);
  const nextStop = firstOpenStop(route.stops);

  const summary = completionSummaryQuery.data;
  const canSubmitComplete =
    summary &&
    (!summary.blocks_completion || (summary.can_force_complete && forceOverride));

  const stickyFooter = canComplete ? (
    <Button
      type="button"
      className="h-14 w-full rounded-xl text-base font-semibold"
      disabled={completeMutation.isPending}
      onClick={() => {
        setForceOverride(false);
        setCompleteOpen(true);
      }}
    >
      <CheckCircle2 className="mr-2 h-6 w-6" aria-hidden />
      Complete route
    </Button>
  ) : null;

  return (
    <RouteManagerShell
      title={route.name}
      subtitle={`${route.scheduled_date ?? ""} · ${route.coverage_city ?? "Area"}`}
      headerAccessory={
        <>
          <StatusBadge kind="route" status={route.route_status ?? ""} className="px-2.5 py-1 text-xs" />
          <div className="hidden flex-col gap-1 md:flex md:w-32">
            <div className="flex justify-between text-[10px] font-medium text-muted-foreground tabular-nums">
              <span>
                {completed}/{total} stops
              </span>
              <span>{pct}%</span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-full rounded-full bg-sky-500/90 transition-[width]" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </>
      }
      stickyFooter={stickyFooter ?? undefined}
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Button type="button" variant="outline" className="h-12 w-full rounded-xl text-base sm:w-auto" asChild>
            <Link href="/admin/routes/today">Today</Link>
          </Button>
          <div className="hidden flex-wrap items-center gap-2 md:flex">
            <Button type="button" variant="outline" className="h-10 min-h-10" asChild>
              <Link href="/admin/routes">All routes</Link>
            </Button>
            {canManageRoutes ? (
              <Button type="button" className="h-10 min-h-10" onClick={openEditDialog}>
                Edit route
              </Button>
            ) : null}
            {canManageRoutes ? (
              <Button type="button" variant="secondary" className="h-10 min-h-10" onClick={() => setAddOpen(true)}>
                Add booking…
              </Button>
            ) : null}
          </div>
        </div>

        <div className="space-y-3 md:hidden">
          <MobileRouteProgress route={route} />
        </div>

        {nextStop ? (
          <div className="md:hidden">
            <MobileNextStopBanner route={route} stop={nextStop} />
          </div>
        ) : null}

        {route.notes ? (
          <Card className="border-white/10 bg-white/5 p-4 text-sm text-slate-200 md:bg-muted/40 md:text-foreground">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 md:text-muted-foreground">
              Notes
            </div>
            <p className="mt-2 whitespace-pre-wrap">{route.notes}</p>
          </Card>
        ) : null}

        {route.assigned_staff ? (
          <div className="text-sm">
            <span className="text-slate-400 md:text-muted-foreground">Driver · </span>
            <span className="font-medium">{route.assigned_staff.name}</span>
          </div>
        ) : (
          <p className="text-xs text-blue-200/90 md:text-primary">No driver assigned.</p>
        )}

        <Separator className="bg-white/10 md:bg-border" />

        <div className="text-sm font-semibold uppercase tracking-wide text-slate-400 md:text-muted-foreground">
          Stops
        </div>

        <ol className="space-y-3">
          {route.stops.map((s, idx) => {
            const isNext = nextStop?.id === s.id;
            return (
            <li key={s.id}>
              <Card
                className={`border-white/10 bg-white/[0.06] p-4 shadow-none backdrop-blur-md md:border-border md:bg-card ${
                  isNext ? "ring-2 ring-sky-400/50 md:ring-0" : ""
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <Link href={`/admin/routes/${route.id}/stops/${s.id}`} className="group flex min-w-0 flex-1 gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-xl font-bold md:h-10 md:w-10 md:text-lg md:bg-muted">
                      {s.sequence}
                    </div>
                    <div className="min-w-0 flex-1">
                      {isNext ? (
                        <div className="mb-1 text-sm font-semibold uppercase tracking-wide text-sky-200 md:hidden">Next</div>
                      ) : null}
                      <div className="text-lg font-bold leading-snug group-hover:underline md:text-base md:font-semibold">
                        {s.company_name ?? "Venue"}
                      </div>
                      {s.booking_reference ? (
                        <div className="mt-1 text-base text-slate-300 md:text-sm md:text-muted-foreground">
                          Booking · <span className="font-medium text-slate-100 md:text-foreground">{s.booking_reference}</span>
                        </div>
                      ) : null}
                      <div className="mt-1 text-base text-slate-300 md:text-sm md:text-muted-foreground">{s.address_line ?? "—"}</div>
                      {s.postcode ? (
                        <div className="mt-0.5 text-base font-medium text-slate-200 md:text-xs md:font-normal md:text-muted-foreground">{s.postcode}</div>
                      ) : null}
                      {s.planned_window ? (
                        <div className="mt-2 text-base text-slate-400 md:text-xs md:text-muted-foreground">
                          <span className="font-medium text-slate-200 md:text-foreground">Planned: </span>
                          {s.planned_window}
                        </div>
                      ) : null}
                      <div className="mt-2 text-base text-slate-400 md:text-xs md:text-muted-foreground">
                        <span className="font-medium text-slate-200 md:text-foreground">Confirmed window: </span>
                        {formatConfirmedWindow(s.confirmed_time_window_start, s.confirmed_time_window_end) ?? "—"}
                        {s.confirmed_collection_date ? ` · ${s.confirmed_collection_date}` : null}
                      </div>
                      {s.customer_notes ? (
                        <p className="mt-2 line-clamp-3 text-base text-slate-200 md:line-clamp-2 md:text-xs md:text-foreground">
                          <span className="text-slate-500 md:text-muted-foreground">Notes: </span>
                          {s.customer_notes}
                        </p>
                      ) : null}
                      {s.damage_notes ? (
                        <p className="mt-1 line-clamp-2 text-base text-blue-200/90 md:text-xs md:text-blue-900 dark:md:text-blue-100">
                          Stop: {s.damage_notes}
                        </p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <StatusBadge kind="route_stop" status={s.route_stop_status ?? ""} className="px-2.5 py-1 text-sm md:text-xs" />
                        {s.estimated_knife_count != null ? (
                          <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-200 md:bg-muted md:px-2 md:text-xs md:text-muted-foreground">
                            ~{s.estimated_knife_count} knives
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                  <div className="hidden shrink-0 flex-col gap-2 border-t border-white/10 pt-3 sm:flex sm:flex-row sm:border-0 sm:pt-0 md:border-0">
                    {canManageRoutes ? (
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-9 w-9 shrink-0"
                          aria-label="Move stop up"
                          disabled={reorderMutation.isPending || idx === 0}
                          onClick={() => {
                            const next = moveIds(stopIdsOrdered, idx, -1);
                            reorderMutation.mutate(next);
                          }}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-9 w-9 shrink-0"
                          aria-label="Move stop down"
                          disabled={reorderMutation.isPending || idx >= stopIdsOrdered.length - 1}
                          onClick={() => {
                            const next = moveIds(stopIdsOrdered, idx, 1);
                            reorderMutation.mutate(next);
                          }}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="secondary" className="h-8" asChild>
                        <Link href={`/admin/routes/${route.id}/stops/${s.id}`}>
                          Stop detail
                          <ExternalLink className="ml-1 h-3.5 w-3.5 opacity-70" aria-hidden />
                        </Link>
                      </Button>
                      {s.booking_id ? (
                        <Button type="button" size="sm" variant="outline" className="h-8" asChild>
                          <Link href={`/admin/bookings/${s.booking_id}`}>Booking</Link>
                        </Button>
                      ) : null}
                      {canManageRoutes && s.route_stop_status === "not_started" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 text-destructive hover:text-destructive"
                          disabled={removeStopMutation.isPending}
                          onClick={() => {
                            if (window.confirm("Remove this stop from the route plan?")) {
                              removeStopMutation.mutate(s.id);
                            }
                          }}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden />
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:hidden">
                    <Button type="button" variant="secondary" className="h-12 w-full rounded-xl text-base" asChild>
                      <Link href={`/admin/routes/${route.id}/stops/${s.id}`}>
                        Open stop
                        <ExternalLink className="ml-2 h-4 w-4 opacity-80" aria-hidden />
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
            );
          })}
        </ol>

        <Card className="border-white/10 bg-white/[0.04] p-4 md:border-border md:bg-card">
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-400 md:text-muted-foreground">Activity</div>
          <div className="mt-3 text-sm text-slate-200 md:text-foreground">
            <AuditTimeline
              items={((route as { audit_timeline?: AuditTimelineRow[] }).audit_timeline ?? [])}
              emptyLabel="No route activity recorded yet."
              showPayload={false}
            />
          </div>
        </Card>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto border-white/10 bg-slate-950 text-slate-50 md:border-border md:bg-background md:text-foreground">
          <DialogHeader>
            <DialogTitle>Edit route</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="er-name">Name</Label>
              <Input id="er-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="er-date">Scheduled date</Label>
              <Input id="er-date" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="er-city">Coverage city</Label>
              <Input id="er-city" value={editCity} onChange={(e) => setEditCity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="er-driver">Driver</Label>
              <select
                id="er-driver"
                className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm md:border-input md:bg-background"
                value={editDriverId}
                onChange={(e) => setEditDriverId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {(driversQuery.data ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.role.replace(/_/g, " ")})
                  </option>
                ))}
              </select>
              {driversQuery.isError ? (
                <p className="text-xs text-destructive">Could not load drivers — save without changing driver.</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="er-notes">Notes</Label>
              <Textarea id="er-notes" rows={3} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saveRouteMutation.isPending || editName.trim().length < 2 || !editDate}
              onClick={() => saveRouteMutation.mutate()}
            >
              {saveRouteMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto border-white/10 bg-slate-950 text-slate-50 md:border-border md:bg-background md:text-foreground">
          <DialogHeader>
            <DialogTitle>Add confirmed booking</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-400 md:text-muted-foreground">
            Shows confirmed bookings on <span className="font-medium text-slate-200 md:text-foreground">{route.scheduled_date}</span>{" "}
            without a route yet. City must match route coverage when the route has a coverage city.
          </p>
          <div className="flex gap-2 py-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" aria-hidden />
              <Input
                className="pl-8"
                placeholder="Search company or address…"
                value={bookingSearch}
                onChange={(e) => setBookingSearch(e.target.value)}
              />
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={() => void bookingsCandidatesQuery.refetch()}>
              Search
            </Button>
          </div>
          <div className="max-h-[50vh] space-y-2 overflow-y-auto">
            {bookingsCandidatesQuery.isLoading ? (
              <div className="flex justify-center py-6 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
              </div>
            ) : bookingsCandidatesQuery.isError ? (
              <p className="text-sm text-destructive">{(bookingsCandidatesQuery.error as Error).message}</p>
            ) : (
              (bookingsCandidatesQuery.data ?? []).map((b) => (
                <div
                  key={b.id}
                  className="flex flex-col gap-2 rounded-lg border border-white/10 p-3 text-sm md:border-border"
                >
                  <div>
                    <div className="font-medium">{b.company?.name ?? "Account"}</div>
                    <div className="text-xs text-slate-400 md:text-muted-foreground">
                      {b.reference ? `${b.reference} · ` : null}
                      {b.venue_city ?? b.company?.city ?? ""}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="self-start"
                    disabled={addStopMutation.isPending}
                    onClick={() => addStopMutation.mutate(b.id)}
                  >
                    Add to route
                  </Button>
                </div>
              ))
            )}
            {!bookingsCandidatesQuery.isLoading &&
            !bookingsCandidatesQuery.isError &&
            (bookingsCandidatesQuery.data ?? []).length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400 md:text-muted-foreground">No matching bookings.</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={completeOpen}
        onOpenChange={(open) => {
          setCompleteOpen(open);
          if (!open) {
            setForceOverride(false);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto border-white/10 bg-slate-950 text-slate-50 md:border-border md:bg-background md:text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl">Complete route</DialogTitle>
            <DialogDescription className="text-base text-slate-300 md:text-muted-foreground">
              Review the run summary before closing <span className="font-medium text-slate-100 md:text-foreground">{route.name}</span>. Open stops or
              missing required photos block drivers until resolved.
            </DialogDescription>
          </DialogHeader>

          {completionSummaryQuery.isLoading ? (
            <div className="flex justify-center py-10 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
            </div>
          ) : completionSummaryQuery.isError ? (
            <p className="text-sm text-red-300 md:text-destructive">{(completionSummaryQuery.error as Error).message}</p>
          ) : summary ? (
            <div className="space-y-5 text-base">
              {summary.blocks_completion ? (
                <div
                  className="flex gap-3 rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 text-amber-50 md:border-amber-600/60 md:bg-amber-500/15 md:text-amber-950 dark:md:text-amber-100"
                  role="alert"
                >
                  <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0" aria-hidden />
                  <div className="space-y-1">
                    <p className="font-semibold leading-snug">This route cannot be completed yet</p>
                    <p className="text-sm leading-relaxed opacity-95 md:opacity-100">
                      {[
                        summary.blockers.includes("outstanding_stops")
                          ? "There are stops still in progress. Finish each visit or mark a failed collection."
                          : null,
                        summary.blockers.includes("missing_required_photos")
                          ? "Required evidence photos are missing for at least one stop."
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-50 md:text-emerald-950 dark:md:text-emerald-100">
                  All stops are closed out and evidence checks pass. You can complete this route.
                </p>
              )}

              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-white/10 bg-white/5 p-3 md:border-border md:bg-muted/30">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 md:text-muted-foreground">Full visits done</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums">{summary.stops_completed_success}</dd>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3 md:border-border md:bg-muted/30">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 md:text-muted-foreground">Failed visits</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums">{summary.stops_failed}</dd>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3 md:border-border md:bg-muted/30">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 md:text-muted-foreground">Open stops</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums text-amber-200 md:text-amber-700 dark:md:text-amber-200">
                    {summary.stops_outstanding}
                  </dd>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3 md:border-border md:bg-muted/30">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 md:text-muted-foreground">Collected (stops)</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums">{summary.stops_collected}</dd>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3 md:border-border md:bg-muted/30">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 md:text-muted-foreground">Returned (stops)</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums">{summary.stops_returned}</dd>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3 md:border-border md:bg-muted/30">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 md:text-muted-foreground">Items (est.)</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums">{summary.items_estimate_collected}</dd>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3 md:border-border md:bg-muted/30">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 md:text-muted-foreground">Orders · collected phase</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums">{summary.orders_collected}</dd>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3 md:border-border md:bg-muted/30">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 md:text-muted-foreground">Orders · returned</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums">{summary.orders_returned}</dd>
                </div>
              </dl>

              {summary.evidence_requirements &&
              (summary.evidence_requirements.require_collection_photo ||
                summary.evidence_requirements.require_return_photo ||
                summary.evidence_requirements.require_failed_collection_photo) ? (
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm md:border-border md:bg-muted/20">
                  <span className="font-medium text-slate-200 md:text-foreground">Photo requirements: </span>
                  <span className="text-slate-300 md:text-muted-foreground">
                    {[
                      summary.evidence_requirements.require_collection_photo ? "collection" : null,
                      summary.evidence_requirements.require_return_photo ? "return" : null,
                      summary.evidence_requirements.require_failed_collection_photo ? "failed visit" : null,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
              ) : null}

              {summary.outstanding_stops.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 md:text-muted-foreground">Outstanding stops</p>
                  <ul className="mt-2 space-y-2">
                    {summary.outstanding_stops.map((s) => (
                      <li
                        key={`out-${s.sequence}-${s.company_name ?? ""}`}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm md:border-border md:bg-muted/20"
                      >
                        <span className="font-medium">#{s.sequence}</span>
                        {s.company_name ? <span className="text-slate-200 md:text-foreground"> · {s.company_name}</span> : null}
                        <span className="block text-slate-400 md:text-muted-foreground">
                          {s.route_stop_status_label ?? s.route_stop_status ?? "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {summary.failed_stops.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 md:text-muted-foreground">Failed visits</p>
                  <ul className="mt-2 space-y-2">
                    {summary.failed_stops.map((s) => (
                      <li
                        key={`fail-${s.sequence}-${s.company_name ?? ""}`}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm md:border-border md:bg-muted/20"
                      >
                        <span className="font-medium">#{s.sequence}</span>
                        {s.company_name ? <span> · {s.company_name}</span> : null}
                        {s.failure_reason ? (
                          <span className="mt-1 block text-slate-300 md:text-muted-foreground">{s.failure_reason}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {summary.photo_gaps.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 md:text-muted-foreground">Missing photos</p>
                  <ul className="mt-2 space-y-2">
                    {summary.photo_gaps.map((g) => (
                      <li
                        key={`photo-${g.stop_sequence}`}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm md:border-border md:bg-muted/20"
                      >
                        Stop #{g.stop_sequence}
                        {g.company_name ? ` · ${g.company_name}` : null}: {g.missing.map((m) => m.label).join(", ")}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {summary.notes_and_issues.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 md:text-muted-foreground">Notes &amp; issues</p>
                  <ul className="mt-2 space-y-2">
                    {summary.notes_and_issues.map((n) => (
                      <li
                        key={`note-${n.stop_sequence}`}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm md:border-border md:bg-muted/20"
                      >
                        #{n.stop_sequence}
                        {n.company_name ? ` · ${n.company_name}` : null}
                        <ul className="mt-1 list-disc pl-4 text-slate-300 md:text-muted-foreground">
                          {n.lines.map((line, li) => (
                            <li key={`${n.stop_sequence}-${li}`}>{line}</li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {route.notes ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 md:text-muted-foreground">Route notes</p>
                  <p className="mt-2 whitespace-pre-wrap rounded-lg border border-white/10 bg-white/5 p-3 text-sm md:border-border md:bg-muted/20">
                    {route.notes}
                  </p>
                </div>
              ) : null}

              {summary.completion_rules && summary.completion_rules.length > 0 ? (
                <div className="text-sm text-slate-400 md:text-muted-foreground">
                  <p className="font-medium text-slate-200 md:text-foreground">Rules</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {summary.completion_rules.map((rule, ri) => (
                      <li key={ri}>{rule}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {summary.blocks_completion && summary.can_force_complete ? (
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/15 bg-white/5 p-4 md:border-border md:bg-muted/30">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 shrink-0 rounded border-white/20 md:border-input"
                    checked={forceOverride}
                    onChange={(e) => setForceOverride(e.target.checked)}
                  />
                  <span className="text-sm leading-relaxed">
                    <span className="font-semibold text-slate-100 md:text-foreground">Override and complete anyway</span>
                    <span className="mt-1 block text-slate-400 md:text-muted-foreground">
                      Only for administrators. This records a forced completion in the audit log.
                    </span>
                  </span>
                </label>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              className="h-12 w-full text-base sm:w-auto"
              onClick={() => setCompleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-12 w-full text-base sm:min-w-[200px]"
              disabled={
                completeMutation.isPending ||
                completionSummaryQuery.isLoading ||
                completionSummaryQuery.isError ||
                !canSubmitComplete
              }
              onClick={() => completeMutation.mutate(forceOverride)}
            >
              {completeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
                  Completing…
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" aria-hidden />
                  Complete route
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RouteManagerShell>
  );
}
