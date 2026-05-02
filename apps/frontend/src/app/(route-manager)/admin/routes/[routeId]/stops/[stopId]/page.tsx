"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ExternalLink, Loader2, MapPinned, PhoneCall, Truck } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { StopDetailResponseSchema } from "@/lib/api/admin-routes-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { formatGBP } from "@/lib/format/money";
import { visibleRouteStopActions, visibleRouteStopFailureAction } from "@/lib/route-manager/route-stop-workflow";

import { RouteManagerShell } from "@/components/layout/RouteManagerShell";
import { RouteStopCustomerPortalSection } from "@/components/route-manager/RouteStopCustomerPortalSection";
import { RouteStopEvidenceSection } from "@/components/route-manager/RouteStopEvidenceSection";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

async function fetchStop(admin: ReturnType<typeof useAdminApi>, stopId: string) {
  const res = await admin.json(`/api/admin/route-stops/${stopId}`);
  if (!res.ok) {
    throw new Error(res.message);
  }
  const parsed = StopDetailResponseSchema.safeParse(res.data);
  if (!parsed.success) {
    throw new Error("Unexpected stop payload.");
  }
  return parsed.data.data;
}

function formatWindowLine(start?: string | null, end?: string | null): string | null {
  if (!start && !end) {
    return null;
  }
  const f = (s: string) => (s.length >= 5 ? s.slice(0, 5) : s);
  return `${start ? f(start) : "?"}–${end ? f(end) : "?"}`;
}

export default function RouteStopDetailPage() {
  const params = useParams<{ routeId: string; stopId: string }>();
  const stopId = params.stopId;
  const routeId = params.routeId;
  const admin = useAdminApi();
  const queryClient = useQueryClient();

  const stopQuery = useQuery({
    queryKey: ["admin-route-stop", stopId],
    enabled: !!stopId,
    queryFn: () => fetchStop(admin, stopId),
  });

  const stop = stopQuery.data;
  const status = stop?.route_stop_status ?? "";

  const [knifeDraft, setKnifeDraft] = useState<number | "">("");
  const [damageDraft, setDamageDraft] = useState("");
  const [failOpen, setFailOpen] = useState(false);
  const [failReason, setFailReason] = useState("");
  const [failNotes, setFailNotes] = useState("");
  const [completeStopOpen, setCompleteStopOpen] = useState(false);

  useEffect(() => {
    if (!stop) {
      return;
    }
    setKnifeDraft(stop.actual_knife_count ?? "");
    setDamageDraft(stop.damage_notes ?? "");
  }, [stop]);
  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: { actual_knife_count?: number; damage_notes?: string } = {};
      if (knifeDraft !== "" && typeof knifeDraft === "number") {
        body.actual_knife_count = knifeDraft;
      }
      if (damageDraft.trim().length > 0) {
        body.damage_notes = damageDraft.trim();
      }
      const res = await admin.json(`/api/admin/route-stops/${stopId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = StopDetailResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected save response.");
      }
      return parsed.data.data;
    },
    onSuccess: () => {
      toast.success("Note saved.");
      void queryClient.invalidateQueries({ queryKey: ["admin-route-stop", stopId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-route-detail", routeId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const transitionMutation = useMutation({
    mutationFn: async (path: string) => {
      const res = await admin.json(`/api/admin/route-stops/${stopId}/${path}`, {
        method: "POST",
        body: "{}",
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = StopDetailResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected status response.");
      }
      return parsed.data.data;
    },
    onSuccess: (data, path) => {
      const labels: Record<string, string> = {
        "mark-travelling": "En route.",
        "mark-arrived": "Arrived.",
        "mark-collected": "Collected.",
        "mark-returned": "Returned.",
        complete: "Stop completed.",
      };
      toast.success(labels[path] ?? "Updated.");
      queryClient.setQueryData(["admin-route-stop", stopId], data);
      void queryClient.invalidateQueries({ queryKey: ["admin-route-detail", routeId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-routes-today"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const skipMutation = useMutation({
    mutationFn: async (payload: {
      failure_reason: string;
      failure_notes?: string;
    }) => {
      const res = await admin.json(`/api/admin/route-stops/${stopId}/mark-skipped`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = StopDetailResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected status response.");
      }
      return parsed.data.data;
    },
    onSuccess: (data) => {
      toast.success("Failed collection recorded.");
      setFailOpen(false);
      setFailReason("");
      setFailNotes("");
      queryClient.setQueryData(["admin-route-stop", stopId], data);
      void queryClient.invalidateQueries({ queryKey: ["admin-route-detail", routeId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-routes-today"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tel = stop?.contact?.phone ? `tel:${stop.contact.phone.replace(/\s+/g, "")}` : null;
  const mapsHref = useMemo(() => {
    if (!stop?.location) {
      return null;
    }
    const bits = [stop.location.line_one, stop.location.line_two, stop.location.city, stop.location.postcode].filter(Boolean).join(", ");

    return bits ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(bits)}` : null;
  }, [stop?.location]);

  const actionRows = useMemo(() => visibleRouteStopActions(status), [status]);
  const failureAction = useMemo(() => visibleRouteStopFailureAction(status), [status]);

  const contactName = [stop?.contact?.first_name, stop?.contact?.last_name].filter(Boolean).join(" ").trim();

  const stickyFooter =
    tel || mapsHref || actionRows.length > 0 || failureAction ? (
      <div className="flex flex-col gap-3">
        {tel || mapsHref ? (
          <div className="grid grid-cols-2 gap-3">
            {tel ? (
              <Button variant="secondary" className="h-14 rounded-xl text-base" type="button" asChild>
                <a href={tel}>
                  <PhoneCall className="mr-2 h-5 w-5" aria-hidden />
                  Call
                </a>
              </Button>
            ) : (
              <span />
            )}
            {mapsHref ? (
              <Button variant="secondary" className="h-14 rounded-xl text-base" type="button" asChild>
                <a href={mapsHref} target="_blank" rel="noreferrer">
                  <MapPinned className="mr-2 h-5 w-5" aria-hidden />
                  Maps
                </a>
              </Button>
            ) : (
              <span />
            )}
          </div>
        ) : null}
        {actionRows.map((row) => (
          <Button
            key={row.key}
            type="button"
            className="h-14 w-full rounded-xl text-base font-semibold"
            disabled={transitionMutation.isPending || skipMutation.isPending}
            onClick={() => {
              if (row.path === "complete") {
                setCompleteStopOpen(true);
                return;
              }
              transitionMutation.mutate(row.path);
            }}
          >
            {transitionMutation.isPending ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <Truck className="mr-2 h-6 w-6" aria-hidden />
            )}
            {row.label}
          </Button>
        ))}
        {failureAction ? (
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full rounded-xl border-amber-500/60 text-base text-amber-100 hover:bg-amber-500/10 hover:text-amber-50"
            disabled={transitionMutation.isPending || skipMutation.isPending}
            onClick={() => setFailOpen(true)}
          >
            {failureAction.label}
          </Button>
        ) : null}
      </div>
    ) : undefined;

  if (stopQuery.status === "pending") {
    return (
      <RouteManagerShell title="Stop">
        <Loader2 className="mx-auto mt-16 h-10 w-10 animate-spin text-slate-400 md:text-muted-foreground" aria-hidden />
      </RouteManagerShell>
    );
  }

  if (stopQuery.status === "error" || !stop) {
    return (
      <RouteManagerShell title="Stop">
        <Card className="border-destructive/40 bg-destructive/10 p-4 text-base text-red-200 md:text-destructive">
          {(stopQuery.error as Error | undefined)?.message ?? "Missing stop."}
        </Card>
        <Button asChild variant="secondary" className="mt-4 h-12 w-full rounded-xl">
          <Link href={`/admin/routes/${routeId}`}>Back to route</Link>
        </Button>
      </RouteManagerShell>
    );
  }

  const confirmedLine = formatWindowLine(stop.booking?.confirmed_time_window_start, stop.booking?.confirmed_time_window_end);
  const requestedLine = formatWindowLine(stop.booking?.time_window_start, stop.booking?.time_window_end);

  return (
    <RouteManagerShell
      title={`Stop ${stop.sequence}`}
      subtitle={stop.company?.name ?? "Venue"}
      stickyFooter={stickyFooter}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="h-11 rounded-xl text-base">
            <Link href={`/admin/routes/${routeId}`}>← Route</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 rounded-xl text-base md:inline-flex">
            <Link href="/admin/routes/today">Today</Link>
          </Button>
        </div>

        <Card className="border-white/10 bg-white/5 p-4 text-slate-100 md:border-border md:bg-muted/40 md:text-foreground">
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-400 md:text-muted-foreground">Stop status</div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge kind="route_stop" status={stop.route_stop_status ?? ""} className="px-3 py-1.5 text-sm" />
            {stop.booking?.status ? (
              <span className="text-base text-slate-300 md:text-muted-foreground">Booking: {stop.booking.status}</span>
            ) : null}
          </div>
        </Card>

        {stop.failure_reason ? (
          <Card className="border-amber-500/35 bg-amber-950/40 p-4 md:border-amber-500/40 md:bg-amber-500/5 md:text-foreground">
            <div className="text-sm font-semibold uppercase tracking-wide text-amber-200 md:text-amber-900 dark:md:text-amber-950">
              Failed collection
            </div>
            <p className="mt-2 text-base font-medium leading-relaxed">{stop.failure_reason}</p>
            {stop.failure_notes ? (
              <p className="mt-2 whitespace-pre-wrap text-base text-slate-200 md:text-muted-foreground">{stop.failure_notes}</p>
            ) : null}
          </Card>
        ) : null}

        <Sheet open={failOpen} onOpenChange={setFailOpen}>
          <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl border-white/10 bg-slate-950 text-slate-50 md:border-border md:bg-background md:text-foreground">
            <SheetHeader>
              <SheetTitle className="text-left text-xl">Failed collection</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 py-2">
              <p className="text-base text-slate-300 md:text-muted-foreground">
                Describe why collection could not happen. This is required for audit and dispatch follow-up.
              </p>
              <div>
                <Label htmlFor="fail-reason" className="text-base">
                  Reason <span className="text-amber-300">*</span>
                </Label>
                <Textarea
                  id="fail-reason"
                  className="mt-2 min-h-[100px] rounded-xl text-base"
                  placeholder="e.g. Site closed, no access, refused handover…"
                  value={failReason}
                  onChange={(e) => setFailReason(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="fail-notes" className="text-base">
                  Extra notes (optional)
                </Label>
                <Textarea
                  id="fail-notes"
                  className="mt-2 min-h-[88px] rounded-xl text-base"
                  placeholder="Gate codes tried, who you spoke to…"
                  value={failNotes}
                  onChange={(e) => setFailNotes(e.target.value)}
                />
              </div>
              <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300 md:border-border md:bg-muted/30 md:text-muted-foreground">
                Add timestamped photos from the “Photos & evidence” section when you can. If ops require a failed-collection
                photo, upload it before submitting.
              </p>
            </div>
            <SheetFooter className="flex-col gap-2 sm:flex-col">
              <Button
                type="button"
                className="h-14 w-full rounded-xl text-base font-semibold"
                disabled={skipMutation.isPending || failReason.trim().length < 3}
                onClick={() => {
                  const payload: {
                    failure_reason: string;
                    failure_notes?: string;
                  } = { failure_reason: failReason.trim() };
                  if (failNotes.trim() !== "") {
                    payload.failure_notes = failNotes.trim();
                  }
                  skipMutation.mutate(payload);
                }}
              >
                {skipMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> : null}
                Submit failed collection
              </Button>
              <Button type="button" variant="ghost" className="h-12 rounded-xl text-base" onClick={() => setFailOpen(false)}>
                Cancel
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <Card className="border-white/10 bg-white/[0.06] p-4 md:border-border md:bg-card">
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-400 md:text-muted-foreground">Site</div>
          <p className="mt-3 text-lg font-bold leading-snug text-white md:text-foreground">{stop.company?.name ?? "—"}</p>
          <p className="mt-2 text-base leading-relaxed text-slate-200 md:text-foreground">
            {[stop.location?.line_one, stop.location?.line_two, stop.location?.city].filter(Boolean).join(", ") || "—"}
          </p>
          {stop.location?.postcode ? <p className="mt-2 text-lg font-semibold text-slate-100 md:text-foreground">{stop.location.postcode}</p> : null}
          {contactName || stop.contact?.phone ? (
            <div className="mt-4 text-base">
              {contactName ? <div className="font-semibold text-slate-100 md:text-foreground">{contactName}</div> : null}
              {stop.contact?.phone ? <div className="mt-1 text-slate-300 md:text-muted-foreground">{stop.contact.phone}</div> : null}
            </div>
          ) : null}
        </Card>

        <Card className="border-white/10 bg-white/[0.04] p-4 md:border-border md:bg-card">
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-400 md:text-muted-foreground">Windows</div>
          <dl className="mt-3 space-y-2 text-base">
            <div>
              <dt className="text-slate-400 md:text-muted-foreground">Confirmed collection</dt>
              <dd className="font-medium text-slate-100 md:text-foreground">
                {confirmedLine ?? "—"}
                {stop.booking?.confirmed_collection_date ? ` · ${stop.booking.confirmed_collection_date}` : null}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400 md:text-muted-foreground">Requested</dt>
              <dd className="font-medium text-slate-100 md:text-foreground">
                {requestedLine ?? "—"}
                {stop.booking?.requested_date ? ` · ${stop.booking.requested_date}` : null}
              </dd>
            </div>
          </dl>
        </Card>

        {stop.booking?.internal_notes || stop.booking?.customer_notes ? (
          <Card className="border-amber-500/30 bg-amber-500/10 p-4 text-slate-50 md:border-amber-500/40 md:bg-amber-500/5 md:text-foreground">
            <div className="text-sm font-semibold uppercase tracking-wide text-amber-100 md:text-amber-900 dark:md:text-amber-950">Access & notes</div>
            {stop.booking.internal_notes ? (
              <div className="mt-2">
                <div className="text-sm font-medium text-amber-50/90 md:text-foreground">Ops / access</div>
                <p className="mt-1 whitespace-pre-wrap text-base leading-relaxed">{stop.booking.internal_notes}</p>
              </div>
            ) : null}
            {stop.booking.customer_notes ? (
              <div className="mt-3">
                <div className="text-sm font-medium text-amber-50/90 md:text-foreground">Customer</div>
                <p className="mt-1 whitespace-pre-wrap text-base leading-relaxed">{stop.booking.customer_notes}</p>
              </div>
            ) : null}
          </Card>
        ) : null}

        {stop.booking && (stop.booking.service_type != null || stop.booking.estimated_knife_count != null) ? (
          <Card className="border-white/10 bg-white/[0.04] p-4 md:border-border md:bg-card">
            <div className="text-sm font-semibold uppercase tracking-wide text-slate-400 md:text-muted-foreground">Booking summary</div>
            <dl className="mt-3 space-y-2 text-base">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-400 md:text-muted-foreground">Service</dt>
                <dd className="font-medium capitalize">{stop.booking.service_type ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-400 md:text-muted-foreground">Est. knives</dt>
                <dd className="font-semibold tabular-nums">{stop.booking.estimated_knife_count ?? "—"}</dd>
              </div>
            </dl>
          </Card>
        ) : null}

        {stop.order ? (
          <Card className="border-white/10 bg-white/[0.04] p-4 md:border-border md:bg-card">
            <div className="text-sm font-semibold uppercase tracking-wide text-slate-400 md:text-muted-foreground">Linked order</div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-medium text-slate-100 md:text-foreground">Workshop order on this stop</p>
                <p className="mt-1 text-lg font-bold tabular-nums">{formatGBP(stop.order.total_pence)}</p>
              </div>
              <Button asChild variant="secondary" className="h-12 w-full shrink-0 rounded-xl sm:w-auto">
                <Link href={`/admin/orders/${stop.order.id}`}>Open order</Link>
              </Button>
            </div>
          </Card>
        ) : null}

        <RouteStopEvidenceSection
          stopId={stopId}
          routeId={routeId}
          photos={stop.evidence_photos ?? []}
          settings={stop.evidence_settings}
          orderKnives={stop.order_knives ?? []}
        />

        <RouteStopCustomerPortalSection
          stopId={stopId}
          routeId={routeId}
          updates={stop.customer_portal_updates ?? []}
          settings={stop.evidence_settings}
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-base text-slate-300 md:text-foreground">Est. knives</Label>
            <div className="mt-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xl font-bold tabular-nums md:border-border md:bg-background">
              {stop.booking?.estimated_knife_count ?? "—"}
            </div>
          </div>
          <div>
            <Label htmlFor="actual-knives" className="text-base text-slate-300 md:text-foreground">
              Actual knives
            </Label>
            <Input
              id="actual-knives"
              inputMode="numeric"
              className="mt-2 h-14 rounded-xl text-xl font-semibold tabular-nums"
              value={knifeDraft === "" ? "" : String(knifeDraft)}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") {
                  setKnifeDraft("");
                  return;
                }
                const n = Number.parseInt(v, 10);
                if (!Number.isNaN(n)) {
                  setKnifeDraft(n);
                }
              }}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="stop-note" className="text-base text-slate-300 md:text-foreground">
            Stop note
          </Label>
          <Textarea
            id="stop-note"
            className="mt-2 min-h-[120px] rounded-xl text-base"
            placeholder="Access issues, counts, failed attempt details…"
            value={damageDraft}
            onChange={(e) => setDamageDraft(e.target.value)}
          />
        </div>

        <Button
          type="button"
          variant="secondary"
          className="h-14 w-full rounded-xl text-base font-semibold"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> : null}
          Save note and knife count
        </Button>

        <Button asChild variant="ghost" className="h-12 w-full rounded-xl text-base">
          <Link href={`/admin/routes/${routeId}`}>
            <ExternalLink className="mr-2 h-5 w-5" aria-hidden />
            Back to route
          </Link>
        </Button>

        <AlertDialog
          open={completeStopOpen}
          onOpenChange={(open) => {
            if (!transitionMutation.isPending) {
              setCompleteStopOpen(open);
            }
          }}
        >
          <AlertDialogContent className="rounded-xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Mark stop completed?</AlertDialogTitle>
              <AlertDialogDescription>
                Only use this when handover and evidence are done for this visit. You can still open the stop from the route if you
                need to fix something right away.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
              <AlertDialogAction
                type="button"
                disabled={transitionMutation.isPending}
                onClick={() => {
                  transitionMutation.mutate("complete", {
                    onSettled: () => setCompleteStopOpen(false),
                  });
                }}
              >
                Complete stop
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RouteManagerShell>
  );
}
