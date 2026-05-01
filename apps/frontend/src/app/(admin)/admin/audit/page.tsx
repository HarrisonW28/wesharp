"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { AuditTimeline, type AuditTimelineRow } from "@/components/admin/AuditTimeline";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaginatedAuditLogsResponseSchema } from "@/lib/api/admin-audit-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";

const SUBJECT_TYPES = [
  { value: "", label: "Any subject" },
  { value: "company", label: "Company" },
  { value: "booking", label: "Booking" },
  { value: "order", label: "Order" },
  { value: "invoice", label: "Invoice" },
  { value: "payment", label: "Payment" },
  { value: "knife", label: "Knife" },
  { value: "operational_route", label: "Route" },
  { value: "route_stop", label: "Route stop" },
  { value: "user", label: "User" },
] as const;

function readFilters(sp: ReturnType<typeof useSearchParams>): Record<string, string> {
  return {
    q: sp.get("q") ?? "",
    date_from: sp.get("date_from") ?? "",
    date_to: sp.get("date_to") ?? "",
    actor_id: sp.get("actor_id") ?? "",
    action: sp.get("action") ?? "",
    subject_type: sp.get("subject_type") ?? "",
    company_id: sp.get("company_id") ?? "",
    request_id: sp.get("request_id") ?? "",
    page: sp.get("page") ?? "1",
    per_page: sp.get("per_page") ?? "25",
  };
}

function buildQueryString(params: Record<string, string>): string {
  const u = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v.trim() !== "") {
      u.set(k, v);
    }
  });
  const s = u.toString();
  return s === "" ? "" : `?${s}`;
}

export default function AdminAuditLogsPage() {
  const admin = useAdminApi();
  const router = useRouter();
  const sp = useSearchParams();

  const applied = useMemo(() => readFilters(sp), [sp]);

  const [draft, setDraft] = useState(applied);

  useEffect(() => {
    setDraft(applied);
  }, [applied]);

  const queryString = useMemo(() => buildQueryString(applied), [applied]);

  const listQuery = useQuery({
    queryKey: ["admin-audit-logs", queryString],
    queryFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/audit-logs${queryString}`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = PaginatedAuditLogsResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected audit log list payload.");
      }
      return parsed.data;
    },
  });

  const pushFilters = useCallback(
    (next: Record<string, string>) => {
      router.push(`/admin/audit${buildQueryString(next)}`);
    },
    [router],
  );

  const apply = useCallback(() => {
    pushFilters({ ...draft, page: "1" });
  }, [draft, pushFilters]);

  const goPage = useCallback(
    (page: number) => {
      pushFilters({ ...applied, page: String(Math.max(1, page)) });
    },
    [applied, pushFilters],
  );

  const items: AuditTimelineRow[] = (listQuery.data?.data.items ?? []) as AuditTimelineRow[];
  const pagination = listQuery.data?.meta?.pagination;
  const page = pagination?.page ?? 1;
  const totalPages = Math.max(1, pagination?.total_pages ?? 1);
  const hasNext = pagination?.has_more_pages ?? page < totalPages;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Breadcrumbs
        items={[
          { label: "Operations", href: "/admin/dashboard" },
          { label: "Audit log", href: "/admin/audit" },
        ]}
      />
      <PageHeader title="Audit log" description="Internal activity across CRM, bookings, orders, and billing." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="q">Search</Label>
              <Input
                id="q"
                placeholder="Action or subject id…"
                value={draft.q}
                onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Subject type</Label>
              <Select
                value={draft.subject_type || "__any__"}
                onValueChange={(v) => setDraft((d) => ({ ...d, subject_type: v === "__any__" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECT_TYPES.map((o) => (
                    <SelectItem key={o.value || "any"} value={o.value || "__any__"}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="df">Date from</Label>
              <Input
                id="df"
                type="date"
                value={draft.date_from}
                onChange={(e) => setDraft((d) => ({ ...d, date_from: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dt">Date to</Label>
              <Input
                id="dt"
                type="date"
                value={draft.date_to}
                onChange={(e) => setDraft((d) => ({ ...d, date_to: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actor">Actor user id</Label>
              <Input
                id="actor"
                inputMode="numeric"
                placeholder="e.g. 12"
                value={draft.actor_id}
                onChange={(e) => setDraft((d) => ({ ...d, actor_id: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="action">Action (exact)</Label>
              <Input
                id="action"
                placeholder="company.updated"
                value={draft.action}
                onChange={(e) => setDraft((d) => ({ ...d, action: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cid">Company id</Label>
              <Input
                id="cid"
                placeholder="UUID"
                value={draft.company_id}
                onChange={(e) => setDraft((d) => ({ ...d, company_id: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rid">Request id</Label>
              <Input
                id="rid"
                placeholder="Correlation id"
                value={draft.request_id}
                onChange={(e) => setDraft((d) => ({ ...d, request_id: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pp">Per page</Label>
              <Select value={draft.per_page} onValueChange={(v) => setDraft((d) => ({ ...d, per_page: v }))}>
                <SelectTrigger id="pp">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={apply}>
              Apply filters
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                router.push("/admin/audit");
              }}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Results</CardTitle>
          {pagination?.total !== undefined ? (
            <span className="text-xs text-muted-foreground">{pagination.total} entries</span>
          ) : null}
        </CardHeader>
        <CardContent>
          {listQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading…
            </div>
          ) : listQuery.isError ? (
            <p className="text-sm text-destructive">{(listQuery.error as Error).message}</p>
          ) : (
            <>
              <AuditTimeline items={items} showPayload />
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => goPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button type="button" variant="outline" size="sm" disabled={!hasNext} onClick={() => goPage(page + 1)}>
                  Next
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Finance and route manager roles see scoped subsets of this index.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
