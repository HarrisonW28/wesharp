import type { z } from "zod";

import type { RouteDetailDataSchema, RouteStopSummarySchema } from "@/lib/api/admin-routes-schema";

type RouteDetail = z.infer<typeof RouteDetailDataSchema>;
type RouteStopSummary = z.infer<typeof RouteStopSummarySchema>;

const TERMINAL = new Set(["completed", "skipped"]);

export function isTerminalRouteStopStatus(status: string | null | undefined): boolean {
  return TERMINAL.has((status ?? "").trim());
}

/** First stop that still needs work (not completed or skipped). */
export function firstOpenStop(stops: RouteStopSummary[]): RouteStopSummary | null {
  const row = stops.find((s) => !isTerminalRouteStopStatus(s.route_stop_status));
  return row ?? null;
}

export function firstOpenStopHref(route: RouteDetail | null): string | null {
  if (!route) {
    return null;
  }
  const next = firstOpenStop(route.stops);
  if (!next) {
    return `/admin/routes/${route.id}`;
  }
  return `/admin/routes/${route.id}/stops/${next.id}`;
}
