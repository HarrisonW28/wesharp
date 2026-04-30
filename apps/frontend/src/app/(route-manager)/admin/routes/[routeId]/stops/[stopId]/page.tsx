"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ExternalLink, Loader2, MapPinned, PhoneCall, Truck } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { StopDetailResponseSchema } from "@/lib/api/admin-routes-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { visibleRouteStopActions } from "@/lib/route-manager/route-stop-workflow";

import { RouteManagerShell } from "@/components/layout/RouteManagerShell";
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
      toast.success("Saved.");
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

  const tel = stop?.contact?.phone ? `tel:${stop.contact.phone.replace(/\s+/g, "")}` : null;
  const mapsHref = useMemo(() => {
    if (!stop?.location) {
      return null;
    }
    const bits = [stop.location.line_one, stop.location.city, stop.location.postcode].filter(Boolean).join(", ");

    return bits ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(bits)}` : null;
  }, [stop?.location]);

  const actionRows = useMemo(() => visibleRouteStopActions(status), [status]);

  const stickyFooter =
    tel || mapsHref || actionRows.length > 0 ? (
      <div className="flex flex-col gap-2">
        {tel || mapsHref ? (
          <div className="grid grid-cols-2 gap-2">
            {tel ? (
              <Button variant="secondary" className="h-12 rounded-xl" type="button" asChild>
                <a href={tel}>
                  <PhoneCall className="mr-2 h-5 w-5" aria-hidden />
                  Call
                </a>
              </Button>
            ) : (
              <span />
            )}
            {mapsHref ? (
              <Button variant="secondary" className="h-12 rounded-xl" type="button" asChild>
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
            disabled={transitionMutation.isPending}
            onClick={() => transitionMutation.mutate(row.path)}
          >
            {transitionMutation.isPending ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <Truck className="mr-2 h-6 w-6" aria-hidden />
            )}
            {row.label}
          </Button>
        ))}
      </div>
    ) : undefined;

  if (stopQuery.status === "pending") {
    return (
      <RouteManagerShell title="Stop">
        <Loader2 className="mx-auto mt-16 h-8 w-8 animate-spin text-slate-400 md:text-muted-foreground" aria-hidden />
      </RouteManagerShell>
    );
  }

  if (stopQuery.status === "error" || !stop) {
    return (
      <RouteManagerShell title="Stop">
        <p className="text-sm text-red-300 md:text-destructive">{(stopQuery.error as Error | undefined)?.message ?? "Missing stop."}</p>
      </RouteManagerShell>
    );
  }

  return (
    <RouteManagerShell title={`Stop ${stop.sequence}`} subtitle={stop.company?.name ?? "Venue"} stickyFooter={stickyFooter}>
      <div className="space-y-4">
        <Card className="border-white/10 bg-white/5 p-4 text-sm md:border-border md:bg-muted/40">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 md:text-muted-foreground">
            Booking & status
          </div>
          <dl className="mt-3 space-y-1 text-xs md:text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-400 md:text-muted-foreground">Stop status</dt>
              <dd className="font-medium capitalize">{stop.route_stop_status?.replace(/_/g, " ")}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-400 md:text-muted-foreground">Booking</dt>
              <dd>{stop.booking?.status ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-400 md:text-muted-foreground">Service</dt>
              <dd className="capitalize">{stop.booking?.service_type ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-400 md:text-muted-foreground">Payment hint</dt>
              <dd className="tabular-nums">{stop.booking?.payment_status_hint ?? "—"}</dd>
            </div>
          </dl>
        </Card>

        {stop.booking?.internal_notes ?? stop.booking?.customer_notes ? (
          <Card className="border-primary/30 bg-primary/10 p-3 text-xs text-foreground">
            <div className="font-semibold text-foreground">Notes</div>
            <p className="mt-1 whitespace-pre-wrap">{stop.booking?.internal_notes ?? stop.booking?.customer_notes}</p>
          </Card>
        ) : null}

        <Card className="border-white/10 bg-white/[0.06] p-4 md:border-border md:bg-card">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 md:text-muted-foreground">Address</div>
          <p className="mt-2 text-sm leading-relaxed">
            {[stop.location?.line_one, stop.location?.city, stop.location?.postcode].filter(Boolean).join(", ") || "—"}
          </p>
          {stop.contact ? (
            <p className="mt-2 text-sm">
              {stop.contact.first_name} {stop.contact.last_name}
              {stop.contact.phone ? <span className="ml-2 text-slate-400 md:text-muted-foreground">{stop.contact.phone}</span> : null}
            </p>
          ) : null}
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Est. knives</Label>
            <div className="mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-lg font-semibold tabular-nums md:border-border md:bg-background">
              {stop.booking?.estimated_knife_count ?? "—"}
            </div>
          </div>
          <div>
            <Label htmlFor="actual-knives" className="text-xs">
              Actual knives
            </Label>
            <Input
              id="actual-knives"
              inputMode="numeric"
              className="mt-1 h-12 text-lg font-semibold tabular-nums"
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
          <Label htmlFor="damage" className="text-xs">
            Damage note
          </Label>
          <Textarea
            id="damage"
            className="mt-1 min-h-[88px] text-base"
            placeholder="Optional"
            value={damageDraft}
            onChange={(e) => setDamageDraft(e.target.value)}
          />
        </div>

        <Button
          type="button"
          variant="secondary"
          className="h-12 w-full rounded-xl"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> : null}
          Save count & damage
        </Button>

        <Button asChild variant="ghost" className="w-full">
          <Link href={`/admin/routes/${routeId}`}>
            <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
            Back to route
          </Link>
        </Button>
      </div>
    </RouteManagerShell>
  );
}
