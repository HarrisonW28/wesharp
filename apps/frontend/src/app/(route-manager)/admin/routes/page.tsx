"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { RoutesListResponseSchema } from "@/lib/api/admin-routes-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";

import { RouteManagerShell } from "@/components/layout/RouteManagerShell";
import { StatusBadge } from "@/components/status/StatusBadge";

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
    <RouteManagerShell title="Routes" subtitle="Collection runs — date, area, driver, status, stops">
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.04] md:border-border md:bg-card">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-white/10 bg-white/5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 md:border-border md:bg-muted/50 md:text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5">Date</th>
              <th className="px-3 py-2.5">Run</th>
              <th className="px-3 py-2.5">Area</th>
              <th className="px-3 py-2.5">Driver</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5 text-right tabular-nums">Stops</th>
            </tr>
          </thead>
          <tbody>
            {(query.data?.length ?? 0) === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-400 md:text-muted-foreground">
                  No routes on this page. Schedule runs from the Ops console or try another page.
                </td>
              </tr>
            ) : (
              query.data?.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-white/5 transition-colors hover:bg-white/[0.06] md:border-border md:hover:bg-muted/40"
                >
                  <td className="px-3 py-3 tabular-nums text-slate-200 md:text-foreground">
                    <Link href={`/admin/routes/${r.id}`} className="text-primary underline underline-offset-2">
                      {r.scheduled_date ?? "—"}
                    </Link>
                  </td>
                  <td className="px-3 py-3 font-medium text-slate-100 md:text-foreground">
                    <Link href={`/admin/routes/${r.id}`} className="hover:underline">
                      {r.name}
                    </Link>
                  </td>
                  <td className="max-w-[140px] truncate px-3 py-3 text-slate-400 md:text-muted-foreground">
                    {r.coverage_city ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-slate-300 md:text-foreground">{r.driver_name ?? "—"}</td>
                  <td className="px-3 py-3">
                    <StatusBadge kind="route" status={r.route_status ?? ""} />
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-slate-300 md:text-foreground">
                    {r.stops_count ?? 0}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
