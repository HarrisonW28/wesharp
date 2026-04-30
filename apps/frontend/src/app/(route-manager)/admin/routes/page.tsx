"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Loader2, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { RoutesListResponseSchema } from "@/lib/api/admin-routes-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";

import { RouteManagerShell } from "@/components/layout/RouteManagerShell";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Card } from "@/components/ui/card";

export default function RoutesListPage() {
  const admin = useAdminApi();
  const searchParams = useSearchParams();
  const page = searchParams.get("page") ?? "1";

  const query = useQuery({
    queryKey: ["admin-routes-list", page],
    queryFn: async () => {
      const res = await admin.json(`/api/admin/routes?paginate=1&per_page=30&page=${encodeURIComponent(page)}`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = RoutesListResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected routes list payload.");
      }
      return parsed.data.data.items;
    },
  });

  if (query.status === "pending") {
    return (
      <RouteManagerShell title="Routes" subtitle="Operational runs">
        <div className="flex min-h-[40vh] items-center justify-center text-slate-400 md:text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        </div>
      </RouteManagerShell>
    );
  }

  if (query.status === "error") {
    return (
      <RouteManagerShell title="Routes">
        <p className="text-sm text-red-300 md:text-destructive">{(query.error as Error).message}</p>
      </RouteManagerShell>
    );
  }

  return (
    <RouteManagerShell title="Routes" subtitle="Operational runs">
      <div className="space-y-3">
        {(query.data?.length ?? 0) === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.04] p-6 text-center text-sm text-slate-400 md:border-border md:bg-muted/20 md:text-muted-foreground">
            No routes returned for this page. Create or schedule runs from the Ops console.
          </p>
        ) : null}
        {query.data?.map((r) => (
          <Link key={r.id} href={`/admin/routes/${r.id}`}>
            <Card className="border-white/10 bg-white/[0.06] p-4 shadow-none backdrop-blur-md transition-colors hover:bg-white/10 md:border-border md:bg-card md:hover:bg-muted/50">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold leading-snug">{r.name}</div>
                  <div className="mt-1 text-xs text-slate-400 md:text-muted-foreground">
                    {r.scheduled_date ?? "—"} ·{" "}
                    <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase md:bg-muted md:normal-case md:text-muted-foreground">
                      <StatusBadge kind="route" status={r.route_status ?? ""} className="border-0 bg-transparent px-0 py-0 text-[10px] font-medium uppercase md:text-xs md:normal-case" />
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400 md:text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                    <span>{r.coverage_city ?? "Area open"}</span>
                  </div>
                  {r.driver_name ? <div className="mt-1 text-xs">{r.driver_name}</div> : null}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
      <div className="mt-6 flex justify-between text-sm">
        {Number(page) > 1 ? (
          <Link href={`/admin/routes?page=${Number(page) - 1}`} className="text-primary underline">
            Previous page
          </Link>
        ) : (
          <span />
        )}
        {(query.data?.length ?? 0) >= 30 ? (
          <Link href={`/admin/routes?page=${Number(page) + 1}`} className="text-primary underline">
            Next page
          </Link>
        ) : null}
      </div>
    </RouteManagerShell>
  );
}
