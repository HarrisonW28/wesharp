"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { RouteDetailResponseSchema } from "@/lib/api/admin-routes-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";

import { RouteManagerShell } from "@/components/layout/RouteManagerShell";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function formatConfirmedWindow(
  start?: string | null,
  end?: string | null,
): string | null {
  if (!start && !end) return null;
  const f = (s: string) => (s.length >= 5 ? s.slice(0, 5) : s);
  return `${start ? f(start) : "?"}–${end ? f(end) : "?"}`;
}

export default function RouteDetailPage() {
  const params = useParams<{ routeId: string }>();
  const routeId = params.routeId;
  const admin = useAdminApi();
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["admin-route-detail", routeId],
    enabled: !!routeId,
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

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await admin.json(`/api/admin/routes/${routeId}/complete`, {
        method: "POST",
        body: "{}",
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
      void queryClient.invalidateQueries({ queryKey: ["admin-route-detail", routeId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-routes-today"] });
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

  const route = detailQuery.data;
  if (!route) {
    return null;
  }

  const { completed, total } = route.progress;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const canComplete = route.route_status === "in_progress";

  const stickyFooter = canComplete ? (
    <Button
      type="button"
      className="h-14 w-full rounded-xl text-base font-semibold"
      disabled={completeMutation.isPending}
      variant="destructive"
      onClick={() => completeMutation.mutate()}
    >
      {completeMutation.isPending ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
          Completing…
        </>
      ) : (
        <>
          <CheckCircle2 className="mr-2 h-6 w-6" aria-hidden />
          Complete route
        </>
      )}
    </Button>
  ) : null;

  return (
    <RouteManagerShell title={route.name} subtitle={`${route.scheduled_date ?? ""} · ${route.coverage_city ?? "Area"}`} stickyFooter={stickyFooter ?? undefined}>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-[11px] text-slate-400 md:text-muted-foreground">
            <span>Progress · {completed}/{total}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/10 md:bg-muted">
            <div className="h-full rounded-full bg-sky-500/90 transition-[width]" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-white/10 px-2 py-1 font-medium md:bg-muted">
              {route.route_status?.replace(/_/g, " ") ?? ""}
            </span>
          </div>
        </div>

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
          <p className="text-xs text-amber-200/90 md:text-amber-600">No driver assigned.</p>
        )}

        <Separator className="bg-white/10 md:bg-border" />

        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 md:text-muted-foreground">
          Stops
        </div>

        <ol className="space-y-3">
          {route.stops.map((s) => (
            <li key={s.id}>
              <Card className="border-white/10 bg-white/[0.06] p-4 shadow-none backdrop-blur-md md:border-border md:bg-card">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <Link href={`/admin/routes/${route.id}/stops/${s.id}`} className="flex min-w-0 flex-1 gap-3 group">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg font-bold md:bg-muted">
                      {s.sequence}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold leading-snug group-hover:underline">{s.company_name ?? "Venue"}</div>
                      <div className="mt-1 text-xs text-slate-400 md:text-muted-foreground">
                        {s.address_line ?? "—"}
                      </div>
                      {s.postcode ? (
                        <div className="mt-0.5 text-[11px] text-slate-500 md:text-muted-foreground">{s.postcode}</div>
                      ) : null}
                      <div className="mt-2 text-[11px] text-slate-400 md:text-muted-foreground">
                        <span className="font-medium text-slate-200 md:text-foreground">Confirmed window: </span>
                        {formatConfirmedWindow(s.confirmed_time_window_start, s.confirmed_time_window_end) ??
                          "—"}
                        {s.confirmed_collection_date ? ` · ${s.confirmed_collection_date}` : null}
                      </div>
                      {s.customer_notes ? (
                        <p className="mt-2 line-clamp-2 text-xs text-slate-300 md:text-foreground">
                          <span className="text-slate-500 md:text-muted-foreground">Notes: </span>
                          {s.customer_notes}
                        </p>
                      ) : null}
                      {s.damage_notes ? (
                        <p className="mt-1 line-clamp-2 text-xs text-amber-200/90 md:text-amber-800">
                          Stop: {s.damage_notes}
                        </p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                        <StatusBadge kind="route_stop" status={s.route_stop_status ?? ""} />
                        {s.estimated_knife_count != null ? (
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-slate-200 md:bg-muted md:text-muted-foreground">
                            ~{s.estimated_knife_count} knives
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                  <div className="flex shrink-0 flex-wrap gap-2 border-t border-white/10 pt-3 sm:border-0 sm:pt-0 md:border-0">
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
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    </RouteManagerShell>
  );
}
