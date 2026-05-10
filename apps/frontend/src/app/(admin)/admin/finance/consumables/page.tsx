"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { z } from "zod";

import {
  ConsumableInventoryRowSchema,
  ConsumableMutationResponseSchema,
  ConsumablesListResponseSchema,
} from "@/lib/api/admin-consumables-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { useBackendMe } from "@/hooks/use-backend-me";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type ConsumableRow = z.infer<typeof ConsumableInventoryRowSchema>;

export default function AdminFinanceConsumablesPage() {
  const admin = useAdminApi();
  const queryClient = useQueryClient();
  const me = useBackendMe();

  const permissions = useMemo(() => new Set(me.data?.data?.permissions ?? []), [me.data?.data?.permissions]);
  const canManage = permissions.has("costs.manage");

  const [lowStockOnly, setLowStockOnly] = useState(false);

  const listQuery = useQuery({
    queryKey: ["admin-consumables", lowStockOnly],
    queryFn: async () => {
      const qs = lowStockOnly ? "?low_stock=1" : "";
      const res = await admin.json<unknown>(`/api/admin/consumables${qs}`);
      if (!res.ok) throw new Error(res.message);
      const parsed = ConsumablesListResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected consumables payload.");
      return parsed.data.data.items;
    },
  });

  useEffect(() => {
    if (listQuery.isError) toast.error((listQuery.error as Error).message);
  }, [listQuery.error, listQuery.isError]);

  const [usageRow, setUsageRow] = useState<ConsumableRow | null>(null);
  const [usageDate, setUsageDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [usageQty, setUsageQty] = useState("1");
  const [usageNotes, setUsageNotes] = useState("");

  const [adjustRow, setAdjustRow] = useState<ConsumableRow | null>(null);
  const [adjustStock, setAdjustStock] = useState("");
  const [adjustThreshold, setAdjustThreshold] = useState("");

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-consumables"], exact: false });

  const usageMutation = useMutation({
    mutationFn: async () => {
      if (!usageRow) throw new Error("No row selected.");
      const qty = Number.parseFloat(usageQty);
      if (!Number.isFinite(qty) || qty <= 0) throw new Error("Enter a positive quantity.");

      const res = await admin.json<unknown>(`/api/admin/consumables/${usageRow.id}/usages`, {
        method: "POST",
        body: JSON.stringify({
          usage_date: usageDate,
          quantity_used: qty,
          notes: usageNotes.trim() === "" ? undefined : usageNotes.trim(),
        }),
      });
      if (!res.ok) throw new Error(res.message);
      const parsed = ConsumableMutationResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected usage response.");
      return parsed.data;
    },
    onSuccess: async () => {
      toast.success("Usage logged and stock updated.");
      setUsageRow(null);
      setUsageNotes("");
      await invalidateList();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const adjustMutation = useMutation({
    mutationFn: async () => {
      if (!adjustRow) throw new Error("No row selected.");
      const stock = Number.parseFloat(adjustStock);
      const thresholdRaw = adjustThreshold.trim();
      const threshold = thresholdRaw === "" ? null : Number.parseFloat(thresholdRaw);

      if (!Number.isFinite(stock) || stock < 0) throw new Error("Stock must be a non-negative number.");
      if (threshold !== null && (!Number.isFinite(threshold) || threshold < 0)) {
        throw new Error("Reorder threshold must be empty or a non-negative number.");
      }

      const body: Record<string, unknown> = { stock_quantity: stock };
      if (thresholdRaw === "") {
        body.reorder_threshold = null;
      } else {
        body.reorder_threshold = threshold;
      }

      const res = await admin.json<unknown>(`/api/admin/consumables/${adjustRow.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(res.message);
      const parsed = ConsumableMutationResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected update response.");
      return parsed.data;
    },
    onSuccess: async () => {
      toast.success("Inventory row updated.");
      setAdjustRow(null);
      await invalidateList();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openUsage = (row: ConsumableRow) => {
    setUsageRow(row);
    setUsageDate(new Date().toISOString().slice(0, 10));
    setUsageQty("1");
    setUsageNotes("");
  };

  const openAdjust = (row: ConsumableRow) => {
    setAdjustRow(row);
    setAdjustStock(row.stock_quantity);
    setAdjustThreshold(row.reorder_threshold ?? "");
  };

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: "Finance", href: "/admin/finance" },
          { label: "Consumables", href: "/admin/finance/consumables" },
        ]}
      />

      <PageHeader
        title="Consumables inventory"
        description="Workshop consumables from the cost catalogue with stock levels, usage logging, and projected restock."
      />

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Catalogue</CardTitle>
            <CardDescription>
              Rows link to cost items (unit cost drives projected restock). Usage logs decrement{" "}
              <span className="font-medium">stock_quantity</span>.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant={lowStockOnly ? "outline" : "default"} size="sm" onClick={() => setLowStockOnly(false)}>
              All SKUs
            </Button>
            <Button variant={lowStockOnly ? "default" : "outline"} size="sm" onClick={() => setLowStockOnly(true)}>
              Low stock only
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/finance/costs">Cost catalogue</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {listQuery.isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading consumables…
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU / item</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Threshold</TableHead>
                    <TableHead className="text-right">Unit cost</TableHead>
                    <TableHead className="text-right">Cost / use</TableHead>
                    <TableHead className="text-right">Proj. restock</TableHead>
                    <TableHead className="text-right w-[200px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(listQuery.data ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{row.name ?? "—"}</span>
                          <div className="flex flex-wrap gap-1">
                            {row.is_low_stock ? (
                              <Badge variant="destructive" className="text-xs">
                                Low stock
                              </Badge>
                            ) : null}
                            {row.stock_unit ? (
                              <Badge variant="outline" className="text-xs">
                                {row.stock_unit}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.stock_quantity}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {row.reorder_threshold ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.formatted_unit_cost}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {row.formatted_cost_per_use ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.formatted_projected_reorder_cost}</TableCell>
                      <TableCell className="text-right">
                        {canManage ? (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => openUsage(row)}>
                              Log usage
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => openAdjust(row)}>
                              Adjust
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">View only</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={usageRow !== null} onOpenChange={(open) => !open && setUsageRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log usage — {usageRow?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="usage-date">Usage date</Label>
              <Input id="usage-date" type="date" value={usageDate} onChange={(e) => setUsageDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="usage-qty">Quantity used ({usageRow?.stock_unit ?? "units"})</Label>
              <Input
                id="usage-qty"
                inputMode="decimal"
                value={usageQty}
                onChange={(e) => setUsageQty(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="usage-notes">Notes (optional)</Label>
              <Textarea id="usage-notes" value={usageNotes} onChange={(e) => setUsageNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUsageRow(null)}>
              Cancel
            </Button>
            <Button onClick={() => usageMutation.mutate()} disabled={usageMutation.isPending}>
              {usageMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Save usage"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustRow !== null} onOpenChange={(open) => !open && setAdjustRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust inventory — {adjustRow?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="adj-stock">Stock quantity</Label>
              <Input
                id="adj-stock"
                inputMode="decimal"
                value={adjustStock}
                onChange={(e) => setAdjustStock(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="adj-threshold">Reorder threshold (blank to clear)</Label>
              <Input
                id="adj-threshold"
                inputMode="decimal"
                value={adjustThreshold}
                onChange={(e) => setAdjustThreshold(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustRow(null)}>
              Cancel
            </Button>
            <Button onClick={() => adjustMutation.mutate()} disabled={adjustMutation.isPending}>
              {adjustMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
