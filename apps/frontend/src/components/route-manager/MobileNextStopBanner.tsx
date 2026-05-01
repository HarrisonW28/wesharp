import Link from "next/link";

import { ChevronRight, MapPin } from "lucide-react";

import type { z } from "zod";

import type { RouteDetailDataSchema, RouteStopSummarySchema } from "@/lib/api/admin-routes-schema";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status/StatusBadge";

type RouteDetail = z.infer<typeof RouteDetailDataSchema>;
type RouteStopSummary = z.infer<typeof RouteStopSummarySchema>;

export function MobileNextStopBanner({
  route,
  stop,
}: {
  route: RouteDetail;
  stop: RouteStopSummary;
}) {
  return (
    <div className="rounded-2xl border border-sky-400/40 bg-sky-500/15 p-4 shadow-sm md:border-sky-500/30 md:bg-sky-500/10">
      <div className="text-sm font-semibold uppercase tracking-wide text-sky-200 md:text-sky-900 dark:md:text-sky-100">Next stop</div>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-lg font-bold leading-snug text-white md:text-foreground">
            {stop.sequence}. {stop.company_name ?? "Venue"}
          </div>
          {stop.address_line ? (
            <div className="mt-1 flex items-start gap-1.5 text-base leading-snug text-slate-200 md:text-foreground">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 opacity-80" aria-hidden />
              <span className="min-w-0">{stop.address_line}</span>
            </div>
          ) : null}
          {stop.postcode ? <div className="mt-1 text-base font-medium text-slate-200 md:text-foreground">{stop.postcode}</div> : null}
          <div className="mt-2">
            <StatusBadge kind="route_stop" status={stop.route_stop_status ?? ""} className="px-3 py-1 text-sm" />
          </div>
        </div>
      </div>
      <Button
        asChild
        className="mt-4 h-14 w-full rounded-xl text-base font-semibold shadow-md"
      >
        <Link href={`/admin/routes/${route.id}/stops/${stop.id}`}>
          Open stop
          <ChevronRight className="ml-2 h-5 w-5" aria-hidden />
        </Link>
      </Button>
    </div>
  );
}
