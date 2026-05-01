"use client";

import Link from "next/link";
import { useMemo } from "react";

import { CalendarDays, Loader2, MapPin, Play, Route } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  RouteDetailResponseSchema,
  TodayResponseSchema,
} from "@/lib/api/admin-routes-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { formatGBP } from "@/lib/format/money";
import { firstOpenStop, firstOpenStopHref } from "@/lib/route-manager/route-stop-helpers";

import { RouteManagerShell } from "@/components/layout/RouteManagerShell";
import { MobileRouteProgress } from "@/components/route-manager/MobileRouteProgress";
import { MobileNextStopBanner } from "@/components/route-manager/MobileNextStopBanner";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function RouteTodayPage() {
  const admin = useAdminApi();
  const queryClient = useQueryClient();

  const todayQuery = useQuery({
    queryKey: ["admin-routes-today"],
    queryFn: async () => {
      const res = await admin.json<unknown>("/api/admin/routes/today");
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = TodayResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected routes/today payload.");
      }
      return parsed.data.data;
    },
  });

  const primary = todayQuery.data?.primary_route ?? null;
  const metrics = todayQuery.data?.metrics;
  const upcoming = todayQuery.data?.upcoming_routes ?? [];
  const nextStop = primary ? firstOpenStop(primary.stops) : null;
  const continueHref = firstOpenStopHref(primary);

  const startMutation = useMutation({
    mutationFn: async () => {
      if (!primary) {
        throw new Error("No route assigned");
      }
      const res = await admin.json(`/api/admin/routes/${primary.id}/start`, { method: "POST", body: "{}" });
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = RouteDetailResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected start-route response.");
      }
      return parsed.data.data;
    },
    onSuccess: () => {
      toast.success("Route started.");
      void queryClient.invalidateQueries({ queryKey: ["admin-routes-today"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const stickyFooter = useMemo(() => {
    if (!primary) {
      return null;
    }
    if (primary.route_status === "scheduled") {
      return (
        <Button
          type="button"
          className="h-14 w-full rounded-xl text-base font-semibold shadow-lg md:mx-auto md:max-w-md"
          disabled={startMutation.isPending}
          onClick={() => startMutation.mutate()}
        >
          {startMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
              Starting…
            </>
          ) : (
            <>
              <Play className="mr-2 h-6 w-6" aria-hidden />
              Start route
            </>
          )}
        </Button>
      );
    }
    if (primary.route_status === "in_progress" && continueHref) {
      return (
        <Button
          asChild
          className="h-14 w-full rounded-xl text-base font-semibold shadow-lg md:mx-auto md:max-w-md"
        >
          <Link href={continueHref}>Continue route</Link>
        </Button>
      );
    }
    return null;
  }, [primary, startMutation, continueHref]);

  if (todayQuery.status === "pending") {
    return (
      <RouteManagerShell title="Today's route">
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-base text-slate-400 md:text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-slate-200 md:text-muted-foreground" aria-hidden />
          Loading today’s routes…
        </div>
      </RouteManagerShell>
    );
  }

  if (todayQuery.status === "error") {
    return (
      <RouteManagerShell title="Today's route">
        <Card className="border-destructive/40 bg-destructive/10 p-4 text-base text-red-200 md:text-destructive">
          {(todayQuery.error as Error).message}
        </Card>
      </RouteManagerShell>
    );
  }

  const safeMetrics = metrics ?? {
    total_stops: 0,
    completed_stops: 0,
    estimated_knives: 0,
    estimated_revenue_pence: 0,
  };

  return (
    <RouteManagerShell
      title="Today's route"
      subtitle={
        primary
          ? `${primary.name} · ${primary.coverage_city ?? "All areas"}`
          : todayQuery.data
            ? "No assignment today"
            : undefined
      }
      stickyFooter={stickyFooter ?? undefined}
    >
      <div className="space-y-5">
        <Card className="border-white/10 bg-white/5 p-4 text-slate-100 shadow-none backdrop-blur-md md:border-border md:bg-card md:text-foreground">
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-400 md:text-muted-foreground">
            {todayQuery.data?.date ?? "Today"}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <div className="text-base text-slate-400 md:text-muted-foreground">Stops done</div>
              <div className="mt-1 text-2xl font-bold tabular-nums md:text-xl">
                {safeMetrics.completed_stops}/{safeMetrics.total_stops}
              </div>
            </div>
            <div>
              <div className="text-base text-slate-400 md:text-muted-foreground">Est. knives</div>
              <div className="mt-1 text-2xl font-bold tabular-nums md:text-xl">{safeMetrics.estimated_knives}</div>
            </div>
            <div className="col-span-2 md:col-span-2">
              <div className="text-base text-slate-400 md:text-muted-foreground">Est. revenue</div>
              <div className="mt-1 text-2xl font-bold tabular-nums md:text-xl">{formatGBP(safeMetrics.estimated_revenue_pence)}</div>
            </div>
          </div>

          <div className="mt-5">
            <MobileRouteProgress route={primary} />
          </div>

          {primary && nextStop ? (
            <div className="mt-5">
              <MobileNextStopBanner route={primary} stop={nextStop} />
            </div>
          ) : null}

          {primary ? (
            <div className="mt-5 flex flex-col gap-3">
              <Button asChild variant="secondary" className="h-12 w-full rounded-xl text-base md:inline-flex md:w-auto">
                <Link href={`/admin/routes/${primary.id}`}>Route detail — all stops</Link>
              </Button>
              {primary.stops.length > 0 ? (
                <div>
                  <div className="text-sm font-semibold uppercase tracking-wide text-slate-400 md:text-muted-foreground">
                    All stops
                  </div>
                  <ol className="mt-3 space-y-2">
                    {primary.stops.map((s) => (
                      <li key={s.id}>
                        <Link
                          href={`/admin/routes/${primary.id}/stops/${s.id}`}
                          className="flex min-h-[3.25rem] items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-base transition-colors hover:bg-white/10 md:border-border md:bg-muted/30"
                        >
                          <span className="min-w-0 font-semibold leading-snug">
                            {s.sequence}. {s.company_name ?? "Venue"}
                          </span>
                          <StatusBadge kind="route_stop" status={s.route_stop_status ?? ""} className="shrink-0 px-2.5 py-1 text-sm" />
                        </Link>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-5 text-center md:border-border md:bg-muted/20">
              <Route className="mx-auto h-10 w-10 text-slate-500" aria-hidden />
              <p className="mt-3 text-lg font-semibold text-slate-100 md:text-foreground">No route assigned today</p>
              <p className="mt-2 text-base text-slate-400 md:text-muted-foreground">
                When you are set as the driver on a run, it will show here with progress and stops.
              </p>
              <Button asChild variant="secondary" className="mt-5 h-12 w-full rounded-xl text-base md:w-auto">
                <Link href="/admin/routes">Browse routes</Link>
              </Button>
            </div>
          )}
        </Card>

        <div>
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-400 md:text-muted-foreground">
            Your runs today ({todayQuery.data?.routes.length ?? 0})
          </div>
          <ol className="mt-3 space-y-3">
            {(todayQuery.data?.routes ?? []).map((r) => (
              <li key={r.id}>
                <Link href={`/admin/routes/${r.id}`}>
                  <Card className="min-h-[4.5rem] border-white/10 bg-white/[0.06] p-4 shadow-none backdrop-blur-md transition-colors hover:bg-white/10 md:border-border md:bg-card md:hover:bg-muted/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-lg font-bold leading-snug">{r.name}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-base text-slate-300 md:text-muted-foreground">
                          <StatusBadge kind="route" status={r.route_status ?? ""} className="text-sm" />
                          {r.driver_name ? <span>{r.driver_name}</span> : <span className="text-sky-200/90">No driver</span>}
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-base text-slate-400 md:text-muted-foreground">
                          <MapPin className="h-5 w-5 shrink-0 opacity-70" aria-hidden />
                          <span>{r.coverage_city ?? "Area TBC"}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-base font-medium tabular-nums text-slate-200 md:text-foreground">
                        {(r.completed_stops ?? 0)}/{(r.stops_count ?? 0)}
                      </div>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ol>
        </div>

        {upcoming.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400 md:text-muted-foreground">
              <CalendarDays className="h-5 w-5" aria-hidden />
              Upcoming
            </div>
            <ol className="mt-3 space-y-3">
              {upcoming.map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/routes/${r.id}`}>
                    <Card className="border-white/10 bg-white/[0.05] p-4 text-slate-100 shadow-none backdrop-blur-md transition-colors hover:bg-white/10 md:border-border md:bg-card md:text-foreground">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="text-lg font-bold">{r.name}</div>
                        <div className="text-base text-slate-400 md:text-muted-foreground">{r.scheduled_date}</div>
                      </div>
                      <div className="mt-2 text-base text-slate-300 md:text-muted-foreground">{r.coverage_city ?? "Area TBC"}</div>
                    </Card>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        <Button asChild variant="outline" className="h-12 w-full rounded-xl text-base md:w-auto">
          <Link href="/admin/routes">All routes</Link>
        </Button>
      </div>
    </RouteManagerShell>
  );
}
