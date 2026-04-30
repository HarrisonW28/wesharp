"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { ColumnDef } from "@tanstack/react-table";
import { Loader2, Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import { InvoiceDetailResponseSchema, InvoiceRowSchema, PaginatedInvoicesResponseSchema } from "@/lib/api/admin-invoices-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { formatGbpFromPence } from "@/lib/format/money";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/tables/DataTable";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type InvoiceRow = z.infer<typeof InvoiceRowSchema>;

export default function AdminInvoicesPage() {
  const admin = useAdminApi();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [orderId, setOrderId] = useState("");

  useEffect(() => {
    const p = new URLSearchParams(searchParams.toString());
    let changed = false;
    const ensure = (key: string, value: string) => {
      if (!p.has(key)) {
        p.set(key, value);
        changed = true;
      }
    };
    ensure("page", "1");
    ensure("per_page", "25");
    if (changed) {
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    }
  }, [pathname, router, searchParams]);

  const listKey = searchParams.toString();

  const listQuery = useQuery({
    queryKey: ["admin-invoices", listKey],
    queryFn: async () => {
      const qs = listKey ? `?${listKey}` : "";
      const res = await admin.json<unknown>(`/api/admin/invoices${qs}`);
      if (!res.ok) throw new Error(res.message);
      const parsed = PaginatedInvoicesResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected invoices payload.");
      return parsed.data.data.items;
    },
  });

  useEffect(() => {
    if (listQuery.isError) toast.error((listQuery.error as Error).message);
  }, [listQuery.error, listQuery.isError]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await admin.json<unknown>("/api/admin/invoices", {
        method: "POST",
        body: JSON.stringify({ order_id: orderId.trim() }),
      });
      if (!res.ok) throw new Error(res.message);
      const d = InvoiceDetailResponseSchema.safeParse(res.data);
      if (!d.success) throw new Error("Unexpected invoice response.");
      return d.data.data;
    },
    onSuccess: (inv) => {
      toast.success("Invoice created.");
      void queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
      setCreateOpen(false);
      setOrderId("");
      if (inv.id) router.push(`/admin/invoices/${inv.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns = useMemo<ColumnDef<InvoiceRow>[]>(
    () => [
      {
        accessorKey: "invoice_number",
        header: "Invoice",
        cell: ({ row }) => (
          <div>
            <div className="font-mono text-sm">{row.original.invoice_number}</div>
            <div className="text-xs text-muted-foreground">{row.original.company_name ?? "—"}</div>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-1">
            <Badge variant="secondary">{(row.original.status ?? "").replace(/_/g, " ")}</Badge>
            {row.original.overdue ? <Badge variant="destructive">Overdue</Badge> : null}
          </div>
        ),
      },
      {
        accessorKey: "payment_status",
        header: "Settlement",
        cell: ({ row }) => <span className="capitalize">{row.original.payment_status ?? "—"}</span>,
      },
      {
        accessorKey: "due_date",
        header: "Due",
        cell: ({ row }) => row.original.due_date ?? "—",
      },
      {
        accessorKey: "total",
        header: "Total",
        cell: ({ row }) => <span className="tabular-nums">{formatGbpFromPence(row.original.total ?? 0)}</span>,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/invoices/${row.original.id}`}>Open</Link>
          </Button>
        ),
      },
    ],
    [],
  );

  const page = Number(searchParams.get("page") ?? "1");
  const prevHref = `/admin/invoices?page=${Math.max(1, page - 1)}&per_page=${searchParams.get("per_page") ?? "25"}`;
  const nextHref = `/admin/invoices?page=${page + 1}&per_page=${searchParams.get("per_page") ?? "25"}`;

  if (listQuery.isPending) {
    return (
      <>
        <Breadcrumbs crumbs={[{ label: "Operations", href: "/admin/dashboard" }, { label: "Invoices" }]} />
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        </div>
      </>
    );
  }

  if (listQuery.isError) {
    return (
      <>
        <Breadcrumbs crumbs={[{ label: "Operations", href: "/admin/dashboard" }, { label: "Invoices" }]} />
        <PageHeader title="Invoices" description="Charge documents linked to orders." />
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          <p className="font-medium text-destructive">{(listQuery.error as Error).message}</p>
          <Button className="mt-3" type="button" variant="outline" size="sm" onClick={() => void listQuery.refetch()}>
            Retry
          </Button>
        </div>
      </>
    );
  }

  const rows = (listQuery.data ?? []) as InvoiceRow[];

  return (
    <>
      <Breadcrumbs crumbs={[{ label: "Operations", href: "/admin/dashboard" }, { label: "Invoices" }]} />
      <PageHeader
        title="Invoices"
        description="Create from fulfilment orders, send (placeholder), mark paid, and void."
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button type="button" className="gap-2">
                <Plus className="h-4 w-4" aria-hidden />
                New invoice
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create from order</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="oid">Order ID (UUID)</Label>
                <Input id="oid" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="Order UUID from /admin/orders" />
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
                  {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No invoices yet.</p>
      ) : (
        <DataTable<InvoiceRow> columns={columns} data={rows} />
      )}
      <div className="mt-4 flex gap-3 text-sm">
        <Link className={page <= 1 ? "pointer-events-none text-muted-foreground" : "text-primary underline"} href={prevHref}>
          Previous
        </Link>
        <Link className="text-primary underline" href={nextHref}>
          Next
        </Link>
      </div>
    </>
  );
}
