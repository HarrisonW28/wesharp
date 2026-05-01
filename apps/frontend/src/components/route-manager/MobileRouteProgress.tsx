import type { z } from "zod";

import type { RouteDetailDataSchema } from "@/lib/api/admin-routes-schema";

type RouteDetail = z.infer<typeof RouteDetailDataSchema>;

export function MobileRouteProgress({
  route,
  className = "",
}: {
  route: RouteDetail | null;
  className?: string;
}) {
  if (!route) {
    return null;
  }
  const { completed, total } = route.progress;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const pending = route.progress.pending ?? Math.max(0, total - completed);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between gap-2 text-sm text-slate-300 md:text-muted-foreground">
        <span className="font-medium">
          {completed}/{total} stops done
        </span>
        <span className="tabular-nums text-slate-200 md:text-foreground">{pct}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-white/15 md:bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-sm text-slate-400 md:text-muted-foreground">{pending} stop{pending === 1 ? "" : "s"} remaining</p>
    </div>
  );
}
