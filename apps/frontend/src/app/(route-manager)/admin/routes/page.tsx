"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { RoutesListResponseSchema } from "@/lib/api/admin-routes-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { useBackendMe } from "@/hooks/use-backend-me";

import { RouteManagerShell } from "@/components/layout/RouteManagerShell";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const ROUTE_STATUS_OPTIONS = [
  { label: "Any status", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Scheduled", value: "scheduled" },
  { label: "In progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
] as const;

export default function RoutesListPage() {
  const admin = useAdminApi();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const { data: me } = useBackendMe();
  const canManageRoutes = useMemo(
    () => new Set(me?.data?.permissions ?? []).has("routes.manage"),
    [me?.data?.permissions],
  );

  const listQueryKey = searchParams.toString();

  const query = useQuery({
    queryKey: ["admin-routes-list", listQueryKey],
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set("paginate", "1");
      qs.set("per_page", "30");
      const page = searchParams.get("page") ?? "1";
      qs.set("page", page);
      const date = searchParams.get("date")?.trim();
      if (date) {
        qs.set("date", date);
      }
      const routeStatus = searchParams.get("route_status") ?? "all";
      if (routeStatus !== "all") {
        qs.set("route_status", routeStatus);
      }
      const driver = searchParams.get("driver_user_id")?.trim();
      if (driver) {
        qs.set("driver_user_id", driver);
      }
      const area = searchParams.get("coverage_city")?.trim();
      if (area) {
        qs.set("coverage_city", area);
      }
      const q = searchParams.get("q")?.trim();
      if (q) {
        qs.set("q", q);
      }

      const res = await admin.json(`/api/admin/routes?${qs.toString()}`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = RoutesListResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected routes list payload.");
      }
      return {
        items: parsed.data.data.items,
        meta: parsed.data.meta?.pagination,
      };
    },
  });

  const updateParam = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(searchParams.toString());
      mutate(p);
      router.replace(`${pathname}?${p.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await admin.json("/api/admin/routes", {
        method: "POST",
        body: JSON.stringify({
          name: newName.trim(),
          scheduled_date: newDate,
          coverage_city: newCity.trim() || null,
          notes: newNotes.trim() || null,
        }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data as { data?: { id?: string } };
    },
    onSuccess: async (data) => {
      toast.success("Route created.");
      setCreateOpen(false);
      setNewName("");
      setNewDate("");
      setNewCity("");
      setNewNotes("");
      await qc.invalidateQueries({ queryKey: ["admin-routes-list"] });
      const id = data?.data?.id;
      if (typeof id === "string") {
        router.push(`/admin/routes/${id}`);
      }
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Create failed."),
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

  const rows = query.data?.items ?? [];
  const pagination = query.data?.meta;
  const page = Number(searchParams.get("page") ?? "1");

  return (
    <RouteManagerShell title="Routes" subtitle="Plan collection & return runs — filter by date, status, driver, area">
      <section className="space-y-4 rounded-xl border border-white/10 bg-white/[0.04] p-4 md:border-border md:bg-card">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="space-y-1.5">
            <Label htmlFor="r-date" className="text-xs text-slate-400 md:text-muted-foreground">
              Run date
            </Label>
            <Input
              id="r-date"
              type="date"
              className="bg-white/5 md:bg-background"
              defaultValue={searchParams.get("date") ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                updateParam((p) => {
                  if (v) {
                    p.set("date", v);
                  } else {
                    p.delete("date");
                  }
                  p.set("page", "1");
                });
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 md:text-muted-foreground">Status</Label>
            <Select
              value={searchParams.get("route_status") ?? "all"}
              onValueChange={(value) =>
                updateParam((p) => {
                  if (value === "all") {
                    p.delete("route_status");
                  } else {
                    p.set("route_status", value);
                  }
                  p.set("page", "1");
                })
              }
            >
              <SelectTrigger className="bg-white/5 md:bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {ROUTE_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-driver" className="text-xs text-slate-400 md:text-muted-foreground">
              Driver user ID
            </Label>
            <Input
              id="r-driver"
              inputMode="numeric"
              placeholder="Numeric id or unassigned"
              className="bg-white/5 md:bg-background"
              defaultValue={searchParams.get("driver_user_id") ?? ""}
              onBlur={(e) => {
                const v = e.target.value.trim();
                updateParam((p) => {
                  if (v) {
                    p.set("driver_user_id", v);
                  } else {
                    p.delete("driver_user_id");
                  }
                  p.set("page", "1");
                });
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-area" className="text-xs text-slate-400 md:text-muted-foreground">
              Area / city contains
            </Label>
            <Input
              id="r-area"
              placeholder="Manchester"
              className="bg-white/5 md:bg-background"
              defaultValue={searchParams.get("coverage_city") ?? ""}
              onBlur={(e) => {
                const v = e.target.value.trim();
                updateParam((p) => {
                  if (v) {
                    p.set("coverage_city", v);
                  } else {
                    p.delete("coverage_city");
                  }
                  p.set("page", "1");
                });
              }}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
            <Label htmlFor="r-q" className="text-xs text-slate-400 md:text-muted-foreground">
              Search name
            </Label>
            <Input
              id="r-q"
              placeholder="Morning Manchester…"
              className="bg-white/5 md:bg-background"
              defaultValue={searchParams.get("q") ?? ""}
              onBlur={(e) => {
                const v = e.target.value.trim();
                updateParam((p) => {
                  if (v) {
                    p.set("q", v);
                  } else {
                    p.delete("q");
                  }
                  p.set("page", "1");
                });
              }}
            />
          </div>
        </div>
        {canManageRoutes ? (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" size="sm" className="min-h-10" onClick={() => setCreateOpen(true)}>
              New route
            </Button>
          </div>
        ) : null}
      </section>

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.04] md:border-border md:bg-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-white/10 bg-white/5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 md:border-border md:bg-muted/50 md:text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5">Date</th>
              <th className="px-3 py-2.5">Run</th>
              <th className="px-3 py-2.5">Area</th>
              <th className="px-3 py-2.5">Driver</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5 text-right tabular-nums">Stops</th>
              <th className="px-3 py-2.5 text-right tabular-nums">Done</th>
              <th className="px-3 py-2.5 text-right tabular-nums">Open</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-slate-400 md:text-muted-foreground">
                  No routes match filters. Try clearing search or create a new run.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
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
                  <td className="px-3 py-3 text-right tabular-nums text-slate-300 md:text-foreground">
                    {r.completed_stops ?? 0}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-slate-300 md:text-foreground">
                    {r.incomplete_stops ?? Math.max(0, (r.stops_count ?? 0) - (r.completed_stops ?? 0))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400 md:text-muted-foreground">
          <span>
            Page {pagination.page}
            {pagination.total != null ? ` · ${pagination.total} routes` : null}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() =>
                updateParam((p) => {
                  p.set("page", String(Math.max(1, page - 1)));
                })
              }
            >
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pagination.has_more_pages === false}
              onClick={() =>
                updateParam((p) => {
                  p.set("page", String(page + 1));
                })
              }
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md border-white/10 bg-slate-950 text-slate-50 md:border-border md:bg-background md:text-foreground">
          <DialogHeader>
            <DialogTitle>New route</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="nr-name">Name</Label>
              <Input
                id="nr-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Manchester AM collection"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nr-date">Scheduled date</Label>
              <Input id="nr-date" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nr-city">Coverage city (optional)</Label>
              <Input id="nr-city" value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="Manchester" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nr-notes">Notes (optional)</Label>
              <Textarea id="nr-notes" rows={3} value={newNotes} onChange={(e) => setNewNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={createMutation.isPending || newName.trim().length < 2 || !newDate}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Saving…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RouteManagerShell>
  );
}
