"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, Loader2, Upload } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { z } from "zod";

import {
  CostImportBatchSummarySchema,
  CostImportCommitResponseSchema,
  CostImportRowPreviewSchema,
  CostImportShowResponseSchema,
  CostImportStoreResponseSchema,
  PaginatedCostImportsResponseSchema,
} from "@/lib/api/admin-cost-import-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { useBackendMe } from "@/hooks/use-backend-me";

import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/tables/DataTable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type BatchSummary = z.infer<typeof CostImportBatchSummarySchema>;
type RowPreview = z.infer<typeof CostImportRowPreviewSchema>;

const PREVIEW_LABELS: Record<string, string> = {
  would_create: "Create",
  would_update: "Update",
  would_skip: "Skip",
  invalid: "Invalid",
};

export default function AdminCostImportPage() {
  const admin = useAdminApi();
  const queryClient = useQueryClient();
  const me = useBackendMe();
  const permissions = useMemo(() => new Set(me.data?.data?.permissions ?? []), [me.data?.data?.permissions]);
  const canManage = permissions.has("costs.manage");

  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);

  const historyQuery = useQuery({
    queryKey: ["admin-cost-imports"],
    queryFn: async () => {
      const res = await admin.json<unknown>("/api/admin/cost-imports?per_page=20");
      if (!res.ok) throw new Error(res.message);
      const parsed = PaginatedCostImportsResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected import history payload.");
      return parsed.data;
    },
  });

  const batchDetailQuery = useQuery({
    queryKey: ["admin-cost-import-batch", activeBatchId],
    enabled: activeBatchId !== null,
    queryFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/cost-imports/${activeBatchId}?per_page=500`);
      if (!res.ok) throw new Error(res.message);
      const parsed = CostImportShowResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected batch preview payload.");
      return parsed.data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.set("file", file);
      const res = await admin.json<unknown>("/api/admin/cost-imports", { method: "POST", body: fd });
      if (!res.ok) throw new Error(res.message);
      const parsed = CostImportStoreResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected upload response.");
      return parsed.data.data.batch;
    },
    onSuccess: async (batch) => {
      toast.success("Workbook parsed — review preview below.");
      setActiveBatchId(batch.id);
      await queryClient.invalidateQueries({ queryKey: ["admin-cost-imports"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-cost-import-batch", batch.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const commitMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const res = await admin.json<unknown>(`/api/admin/cost-imports/${batchId}/commit`, {
        method: "POST",
        body: "{}",
      });
      if (!res.ok) throw new Error(res.message);
      const parsed = CostImportCommitResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected commit response.");
      return parsed.data.data.batch;
    },
    onSuccess: async (batch) => {
      toast.success(
        `Import committed — created ${batch.rows_created}, updated ${batch.rows_updated}, skipped ${batch.rows_skipped}.`,
      );
      await queryClient.invalidateQueries({ queryKey: ["admin-cost-imports"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-cost-import-batch", batch.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onPickFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      e.target.value = "";
      if (!f) return;
      uploadMutation.mutate(f);
    },
    [uploadMutation],
  );

  const previewRows = batchDetailQuery.data?.data.rows ?? [];
  const previewBatch = batchDetailQuery.data?.data.batch;

  const rowColumns = useMemo<ColumnDef<RowPreview>[]>(
    () => [
      {
        accessorKey: "sheet_name",
        header: "Sheet",
        cell: ({ row }) => <span className="text-sm">{row.original.sheet_name}</span>,
      },
      {
        accessorKey: "row_number",
        header: "Row",
        cell: ({ row }) => <span className="tabular-nums text-sm">{row.original.row_number}</span>,
      },
      {
        id: "item",
        header: "Raw",
        cell: ({ row }) => (
          <span className="max-w-[240px] truncate text-xs text-muted-foreground">
            {JSON.stringify(row.original.raw_data ?? {})}
          </span>
        ),
      },
      {
        id: "action",
        header: "Preview",
        cell: ({ row }) => (
          <Badge variant="outline" className="text-[10px]">
            {PREVIEW_LABELS[row.original.preview_action] ?? row.original.preview_action}
          </Badge>
        ),
      },
      {
        id: "err",
        header: "Notes",
        cell: ({ row }) => (
          <span className="text-xs text-destructive">{row.original.error_message ?? ""}</span>
        ),
      },
    ],
    [],
  );

  const historyRows: BatchSummary[] = historyQuery.data?.data.batches ?? [];

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Finance", href: "/admin/finance" },
          { label: "Cost catalogue", href: "/admin/finance/costs" },
          { label: "Import" },
        ]}
      />
      <PageHeader
        title="Cost workbook import"
        description="Upload a Cost Plan / consumables workbook (CSV or Excel). Rows are validated before anything is written — commit only when the preview looks correct."
        actions={
          <Button type="button" variant="outline" size="sm" className="rounded-lg" asChild>
            <Link href="/admin/finance/costs">
              <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden />
              Catalogue
            </Link>
          </Button>
        }
      />

      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-4">
          <div className="grid gap-1">
            <Label htmlFor="cost-import-file">Workbook file</Label>
            <Input
              id="cost-import-file"
              type="file"
              accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              disabled={!canManage || uploadMutation.isPending}
              className="max-w-md rounded-lg"
              onChange={onPickFile}
            />
          </div>
          {!canManage ? (
            <p className="text-sm text-muted-foreground pb-1">
              View-only access — ask Finance to upload or commit imports.
            </p>
          ) : null}
        </div>
        {uploadMutation.isPending ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Parsing workbook…
          </div>
        ) : null}
      </div>

      {batchDetailQuery.isError ? (
        <p className="text-sm text-destructive">{(batchDetailQuery.error as Error).message}</p>
      ) : null}

      {previewBatch ? (
        <div className="space-y-4 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Preview</h2>
              <p className="text-sm text-muted-foreground">
                {previewBatch.filename} — status <Badge variant="secondary">{previewBatch.status}</Badge> —{" "}
                {previewBatch.rows_detected} rows detected
              </p>
            </div>
            {canManage && previewBatch.status === "preview_ready" ? (
              <Button
                type="button"
                className="rounded-lg gap-2"
                disabled={commitMutation.isPending}
                onClick={() => activeBatchId && commitMutation.mutate(activeBatchId)}
              >
                {commitMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Upload className="h-4 w-4" aria-hidden />
                )}
                Commit import
              </Button>
            ) : null}
          </div>

          {previewBatch.warnings && previewBatch.warnings.length > 0 ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
              <p className="font-medium text-amber-900 dark:text-amber-200">Warnings</p>
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                {previewBatch.warnings.map((w, i) => (
                  <li key={i}>
                    {typeof w === "string"
                      ? w
                      : typeof w === "object" && w !== null && "message" in w
                        ? String((w as { message: unknown }).message)
                        : JSON.stringify(w)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {previewBatch.errors && previewBatch.errors.length > 0 ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <p className="font-medium text-destructive">Errors</p>
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                {previewBatch.errors.map((e, i) => (
                  <li key={i}>{typeof e.message === "string" ? e.message : JSON.stringify(e)}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {previewBatch.cash_snapshot && Object.keys(previewBatch.cash_snapshot).length > 0 ? (
            <details className="rounded-lg border p-3 text-sm">
              <summary className="cursor-pointer font-medium">Cash position snapshot (JSON)</summary>
              <pre className="mt-2 max-h-48 overflow-auto text-xs">{JSON.stringify(previewBatch.cash_snapshot, null, 2)}</pre>
            </details>
          ) : null}

          {batchDetailQuery.isPending ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
              Loading preview rows…
            </div>
          ) : (
            <DataTable columns={rowColumns} data={previewRows} />
          )}
        </div>
      ) : null}

      <div className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">Recent imports</h2>
        {historyQuery.isPending ? (
          <div className="flex items-center gap-2 text-muted-foreground py-6">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Loading…
          </div>
        ) : historyQuery.isError ? (
          <p className="text-sm text-destructive">{(historyQuery.error as Error).message}</p>
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Rows</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyRows.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {b.created_at ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">{b.filename}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{b.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{b.rows_detected}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-lg"
                        onClick={() => setActiveBatchId(b.id)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
