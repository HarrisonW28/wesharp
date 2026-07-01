"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  CostAllocationCreateResponseSchema,
  CostAllocationsListResponseSchema,
} from "@/lib/api/admin-cost-allocations-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { formatGBP } from "@/lib/format/money";
import { useBackendMe } from "@/hooks/use-backend-me";

import { NavBreadcrumbs } from "@/components/layout/NavBreadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const TARGET_TYPES = [
  { value: "company", label: "Company / customer" },
  { value: "order", label: "Order" },
  { value: "route", label: "Route (whole day)" },
  { value: "route_stop", label: "Route stop" },
  { value: "booking", label: "Booking" },
  { value: "invoice", label: "Invoice" },
  { value: "subscription", label: "Company subscription" },
] as const;

const METHODS = [
  { value: "direct_manual", label: "Direct manual" },
  { value: "percentage", label: "Percentage" },
  { value: "per_knife", label: "Per knife" },
  { value: "per_order", label: "Per order" },
  { value: "per_route", label: "Per route" },
  { value: "monthly_overhead", label: "Monthly overhead" },
] as const;

function gbpToPence(raw: string): number | null {
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export default function AdminFinanceCostLedgerPage() {
  const admin = useAdminApi();
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const me = useBackendMe();
  const permissions = useMemo(() => new Set(me.data?.data?.permissions ?? []), [me.data?.data?.permissions]);
  const canManage = permissions.has("costs.manage");

  const initialCompany = searchParams.get("company_id") ?? "";

  const [companyFilter, setCompanyFilter] = useState(initialCompany);
  useEffect(() => {
    setCompanyFilter(initialCompany);
  }, [initialCompany]);

  const listQs = companyFilter.trim() !== "" ? `?company_id=${encodeURIComponent(companyFilter.trim())}&per_page=50` : "?per_page=50";

  const listQuery = useQuery({
    queryKey: ["admin-cost-allocations", companyFilter.trim()],
    queryFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/cost-allocations${listQs}`);
      if (!res.ok) throw new Error(res.message);
      const parsed = CostAllocationsListResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected cost allocations payload.");
      return parsed.data.data;
    },
  });

  useEffect(() => {
    if (listQuery.isError) toast.error((listQuery.error as Error).message);
  }, [listQuery.error, listQuery.isError]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [amountGbp, setAmountGbp] = useState("");
  const [targetType, setTargetType] = useState<string>("company");
  const [targetId, setTargetId] = useState("");
  const [method, setMethod] = useState<string>("direct_manual");
  const [notes, setNotes] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const pence = gbpToPence(amountGbp);
      if (pence === null) throw new Error("Enter a positive amount in GBP.");
      if (!targetId.trim()) throw new Error("Enter target UUID.");

      const res = await admin.json<unknown>("/api/admin/cost-allocations", {
        method: "POST",
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId.trim(),
          amount_pence: pence,
          allocation_method: method,
          notes: notes.trim() === "" ? undefined : notes.trim(),
        }),
      });
      if (!res.ok) throw new Error(res.message);
      const parsed = CostAllocationCreateResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected create response.");
      return parsed.data;
    },
    onSuccess: async () => {
      toast.success("Allocation recorded.");
      setDialogOpen(false);
      setAmountGbp("");
      setTargetId("");
      setNotes("");
      await qc.invalidateQueries({ queryKey: ["admin-cost-allocations"], exact: false });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = listQuery.data?.items ?? [];
  const totalListed = items.reduce((s, r) => s + r.amount_pence, 0);

  return (
    <div className="space-y-8">
      <NavBreadcrumbs />
      <PageHeader
        title="Cost ledger"
        description="Record how internal costs are attributed to customers, orders, routes and invoices — used in margin and billing views."
      />

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Allocations</CardTitle>
            <CardDescription>
              Filter by CRM account UUID to align with company rollup logic (targets attributed to that customer include linked orders,
              invoices, bookings, subscriptions, and stops).
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/finance/costs">Cost catalogue</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/reports/billing">Open billing report</Link>
            </Button>
            {canManage ? (
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                New allocation
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="company-filter">Company filter (UUID)</Label>
              <Input
                id="company-filter"
                placeholder="Optional — paste company id"
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
              />
            </div>
            <Button type="button" variant="secondary" onClick={() => void listQuery.refetch()}>
              Refresh
            </Button>
          </div>
          {!companyFilter.trim() ? (
            <p className="text-sm text-muted-foreground">
              Showing all allocations — totals reflect listed rows only. CRM margins compute lifetime attribution using richer joins than this table filter.
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="tabular-nums">Rows shown (filtered page): {listQuery.data?.meta.total ?? 0}</span>
            <span aria-hidden>·</span>
            <span className="tabular-nums">Sum amounts this page: {formatGBP(totalListed)}</span>
          </div>

          {listQuery.isPending ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading ledger…
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Cost item</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Recorded by</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {row.created_at?.replace("T", " ").slice(0, 16) ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="w-fit text-xs">
                            {row.target_type}
                          </Badge>
                          <span className="font-mono text-[11px] text-muted-foreground">{row.target_id}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm capitalize">{row.allocation_method.replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{row.formatted_amount}</TableCell>
                      <TableCell className="text-sm">{row.cost_item_name ?? "—"}</TableCell>
                      <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">{row.notes ?? "—"}</TableCell>
                      <TableCell className="text-sm">{row.created_by_name ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(o) => !createMutation.isPending && setDialogOpen(o)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New allocation</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="amount-gbp">Amount (GBP)</Label>
              <Input id="amount-gbp" inputMode="decimal" placeholder="e.g. 42.50" value={amountGbp} onChange={(e) => setAmountGbp(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Target type</Label>
              <Select value={targetType} onValueChange={setTargetType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="target-id">Target UUID</Label>
              <Input id="target-id" placeholder="Paste entity id" value={targetId} onChange={(e) => setTargetId(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="alloc-notes">Notes</Label>
              <Textarea id="alloc-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setDialogOpen(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Save allocation"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
