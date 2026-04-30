"use client";

import Link from "next/link";
import { useMemo } from "react";

import { Loader2, MapPin, Play, TrendingUp } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { z } from "zod";

import {
  RouteDetailDataSchema,
  RouteDetailResponseSchema,
  TodayResponseSchema,
} from "@/lib/api/admin-routes-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { formatGbpFromPence } from "@/lib/format/money";

import { RouteManagerShell } from "@/components/layout/RouteManagerShell";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type RouteDetail = z.infer<typeof RouteDetailDataSchema>;

function ProgressLine({ route }: { route: RouteDetail | null }) {
  if (!route) {
    return null;
  }
  const { completed, total } = route.progress;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] text-slate-400 md:text-muted-foreground">
        <span>
          Progress · {completed}/{total} stops
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10 md:bg-muted">
        <div
          className="h-full rounded-full bg-emerald-500/90 transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

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

  const sticky = useMemo(() => {
    if (!primary || primary.route_status !== "scheduled") {
      return null;
    }
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
  }, [primary, startMutation]);

  if (todayQuery.status === "pending") {
    return (
      <RouteManagerShell title="Today's route">
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-sm text-slate-400 md:text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-slate-200 md:text-muted-foreground" aria-hidden />
          Loading today’s routes…
        </div>
      </RouteManagerShell>
    );
  }

  if (todayQuery.status === "error") {
    return (
      <RouteManagerShell title="Today's route">
        <p className="text-sm text-red-300 md:text-destructive">{(todayQuery.error as Error).message}</p>
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
      stickyFooter={sticky ?? undefined}
    >
      <div className="space-y-4">
        <Card className="border-white/10 bg-white/5 p-4 text-sm text-slate-200 shadow-none backdrop-blur-md md:border-border md:bg-card md:text-foreground">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 md:text-muted-foreground">
            {todayQuery.data?.date ?? "Today"}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs md:grid-cols-4 md:text-sm">
            <div>
              <div className="text-slate-400 md:text-muted-foreground">Stops done</div>
              <div className="text-lg font-semibold tabular-nums">
                {safeMetrics.completed_stops}/{safeMetrics.total_stops}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-slate-400 md:text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" aria-hidden /> Est. knives
              </div>
              <div className="text-lg font-semibold tabular-nums">{safeMetrics.estimated_knives}</div>
            </div>
            <div className="col-span-2 md:col-span-1">
              <div className="text-slate-400 md:text-muted-foreground">Est. revenue</div>
              <div className="text-lg font-semibold tabular-nums">{formatGbpFromPence(safeMetrics.estimated_revenue_pence)}</div>
            </div>
          </div>
          <ProgressLine route={primary} />
          {primary ? (
            <div className="mt-4 space-y-3">
              <Button asChild variant="secondary" className="h-11 w-full rounded-xl md:inline-flex md:w-auto">
                <Link href={`/admin/routes/${primary.id}`}>Open route detail</Link>
              </Button>
              {primary.stops.length > 0 ? (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 md:text-muted-foreground">
                    Jump to stop
                  </div>
                  <ol className="mt-2 space-y-2">
                    {primary.stops.map((s) => (
                      <li key={s.id}>
                        <Link
                          href={`/admin/routes/${primary.id}/stops/${s.id}`}
                          className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm transition-colors hover:bg-white/10 md:border-border md:bg-muted/30"
                        >
                          <span className="font-medium">
                            {s.sequence}. {s.company_name ?? "Venue"}
                          </span>
                          <StatusBadge kind="route_stop" status={s.route_stop_status ?? ""} className="shrink-0 text-[10px] md:text-xs" />
                        </Link>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-xs text-slate-400 md:text-muted-foreground">
              You’re not assigned as driver on a route today. Open all routes below or assign a driver on the Ops console.
            </p>
          )}
        </Card>

        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 md:text-muted-foreground">
          Runs today ({todayQuery.data?.routes.length ?? 0})
        </div>

        <ol className="space-y-3">
          {(todayQuery.data?.routes ?? []).map((r) => (
            <li key={r.id}>
              <Link href={`/admin/routes/${r.id}`}>
                <Card className="border-white/10 bg-white/[0.06] p-4 shadow-none backdrop-blur-md transition-colors hover:bg-white/10 md:border-border md:bg-card md:hover:bg-muted/50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold">{r.name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-300 md:text-muted-foreground">
                        <StatusBadge kind="route" status={r.route_status ?? ""} />
                        {r.driver_name ? <span>{r.driver_name}</span> : <span className="text-amber-200/90">No driver</span>}
                      </div>
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400 md:text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                        <span>{r.coverage_city ?? "Area TBC"}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-xs tabular-nums text-slate-300 md:text-foreground">
                      <div>
                        {(r.completed_stops ?? 0)}/{(r.stops_count ?? 0)} stops
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ol>

        <div className="text-center md:text-left">
          <Button asChild variant="outline" size="lg" className="h-12 w-full rounded-xl md:w-auto">
            <Link href="/admin/routes">All routes</Link>
          </Button>
        </div>
      </div>
    </RouteManagerShell>
  );
}
