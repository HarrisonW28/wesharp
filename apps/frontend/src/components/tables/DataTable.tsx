"use client";

import { Inbox } from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  emptyLabel?: string;
  emptyDescription?: string;
};

export function DataTable<TData>({
  columns,
  data,
  emptyLabel = "Nothing here yet",
  emptyDescription = "There is no data to show in this table.",
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="space-y-3">
      <ScrollArea className="w-full rounded-xl border bg-card">
        <table className="w-full min-w-[720px] caption-bottom text-sm">
          <thead className="bg-muted/40 [&_tr]:border-b">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="h-11 px-4 text-left align-middle font-semibold text-muted-foreground">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Inbox className="h-6 w-6 text-muted-foreground" aria-hidden />
                    </div>
                    <p className="text-sm font-medium text-foreground">{emptyLabel}</p>
                    <p className="max-w-sm text-xs text-muted-foreground">{emptyDescription}</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b transition-colors hover:bg-muted/30">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
        <span>
          Showing <span className="font-medium text-foreground">{rows.length}</span> rows
        </span>
        <Button type="button" size="sm" variant="outline" className="rounded-xl" disabled>
          Export (soon)
        </Button>
      </div>
    </div>
  );
}
