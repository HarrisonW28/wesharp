"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { ColumnDef } from "@tanstack/react-table";
import { Loader2, Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import {
  InvoiceDetailResponseSchema,
  InvoiceRowSchema,
  PaginatedInvoicesResponseSchema,
} from "@/lib/api/admin-invoices-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { formatDisplayDate } from "@/lib/format/dates";
import { paginationRangeCaption } from "@/lib/format/pagination-caption";
import { formatGBP } from "@/lib/format/money";

import { CompanyLookup, OrderLookup } from "@/components/admin/lookups/AsyncEntityLookup";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/tables/DataTable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

type InvoiceRow = z.infer<typeof InvoiceRowSchema>;

const STATUS_OPTIONS = [
  { value: "__any__", label: "Any invoice status" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "void", label: "Void" },
];

const SETTLEMENT_OPTIONS = [
  { value: "__any__", label: "Any settlement" },
  { value: "unpaid", label: "Unpaid balance" },
  { value: "partial", label: "Partially paid" },
  { value: "paid", label: "Fully settled" },
];

export default function AdminInvoicesPage() {
  const admin = useAdminApi();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const qFromUrl = searchParams.get("q") ?? "";
  const [qDraft, setQDraft] = useState(qFromUrl);

  useEffect(() => {
    setQDraft(qFromUrl);
  }, [qFromUrl]);

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

  useEffect(() => {
    const id = window.setTimeout(() => {
      const next = qDraft.trim();
      const cur = qFromUrl.trim();
      if (next === cur) return;
      const nextParams = new URLSearchParams(searchParams.toString());
      if (next) {
        nextParams.set("q", next);
      } else {
        nextParams.delete("q");
      }
      nextParams.set("page", "1");
      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
    }, 400);
    return () => window.clearTimeout(id);
  }, [qDraft, qFromUrl, pathname, router, searchParams]);

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      if (value === null || value === "") {
        nextParams.delete(key);
      } else {
        nextParams.set(key, value);
      }
      nextParams.set("page", "1");
      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const listKey = searchParams.toString();

  const listQuery = useQuery({
    queryKey: ["admin-invoices", listKey],
    queryFn: async () => {
      const qs = listKey ? `?${listKey}` : "";
      const res = await admin.json<unknown>(`/api/admin/invoices${qs}`);
      if (!res.ok) throw new Error(res.message);
      const parsed = PaginatedInvoicesResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected invoices payload.");
      return {
        items: parsed.data.data.items,
        pagination: parsed.data.meta?.pagination,
      };
    },
  });

  useEffect(() => {
    if (listQuery.isError) toast.error((listQuery.error as Error).message);
  }, [listQuery.error, listQuery.isError]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await admin.json<unknown>("/api/admin/invoices", {
        method: "POST",
        body: JSON.stringify({ order_id: (orderId ?? "").trim() }),
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
      setOrderId(null);
      if (inv.id) router.push(`/admin/invoices/${inv.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns = useMemo<ColumnDef<InvoiceRow>[]>(
    () => [
      {
        id: "ref",
        header: "Invoice",
        cell: ({ row }) => {
          const label = row.original.display_reference ?? row.original.invoice_number ?? "Invoice";
          return (
            <div>
              <Link
                className="text-base font-semibold text-primary underline underline-offset-2"
                href={`/admin/invoices/${row.original.id}`}
              >
                {label}
              </Link>
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                <span>{row.original.company_name ?? "—"}</span>
                {row.original.company?.is_deleted ? (
                  <Badge variant="secondary" className="w-fit font-normal">
                    Removed from CRM
                  </Badge>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        id: "source",
        header: "Source",
        cell: ({ row }) => {
          const lo = row.original.linked_order;
          if (!lo?.reference && !lo?.display_reference) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }
          return (
            <div className="text-sm">
              <span className="text-muted-foreground">Order </span>
              <span className="font-medium">{lo.reference ?? lo.display_reference}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-1">
            <StatusBadge kind="invoice" status={row.original.status ?? ""} />
            {row.original.overdue ? <Badge variant="destructive">Overdue</Badge> : null}
          </div>
        ),
      },
      {
        accessorKey: "payment_status",
        header: "Settlement",
        cell: ({ row }) => (
          <StatusBadge kind="payment" status={(row.original.payment_status as string | null | undefined) ?? ""} />
        ),
      },
      {
        accessorKey: "due_date",
        header: "Due",
        cell: ({ row }) => formatDisplayDate(row.original.due_date ?? null),
      },
      {
        accessorKey: "total",
        header: "Total",
        cell: ({ row }) => (
          <span className="text-base font-medium tabular-nums">{formatGBP(row.original.total ?? 0)}</span>
        ),
      },
      {
        id: "out",
        header: "Outstanding",
        cell: ({ row }) => (
          <span className="tabular-nums text-sm font-medium">
            {row.original.formatted_outstanding ?? formatGBP(row.original.outstanding_pence ?? 0)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button asChild size="lg" variant="default" className="min-w-[7rem]">
            <Link href={`/admin/invoices/${row.original.id}`}>Open</Link>
          </Button>
        ),
      },
    ],
    [],
  );

  const page = listQuery.data?.pagination?.page ?? Number(searchParams.get("page") ?? "1");
  const totalPages = listQuery.data?.pagination?.total_pages ?? 1;
  const hasMore = listQuery.data?.pagination?.has_more_pages ?? false;

  const goPage = (p: number) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("page", String(Math.max(1, p)));
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

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
          <Button className="mt-3" type="button" variant="outline" size="default" onClick={() => void listQuery.refetch()}>
            Retry
          </Button>
        </div>
      </>
    );
  }

  const rows = listQuery.data?.items ?? [];
  const filterCompanyId = searchParams.get("company_id");
  const overdueOnly = searchParams.get("overdue") === "1" || searchParams.get("overdue") === "true";
  const invPag = listQuery.data?.pagination;
  const invRangeCaptionText = invPag ? paginationRangeCaption(page, invPag.per_page, invPag.total) : null;

  return (
    <>
      <Breadcrumbs crumbs={[{ label: "Operations", href: "/admin/dashboard" }, { label: "Invoices" }]} />
      <PageHeader
        title="Invoices"
        description="Search, filter, and manage AR documents — totals and settlement at a glance."
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button type="button" size="lg" className="gap-2">
                <Plus className="h-4 w-4" aria-hidden />
                New invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[min(90vh,calc(100dvh-2rem))] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Invoice from order</DialogTitle>
                <DialogDescription>Pick one order — a draft invoice is created from its lines and totals.</DialogDescription>
              </DialogHeader>
              <OrderLookup label="Order" value={orderId} onChange={setOrderId} placeholder="Search by account or order…" />
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-12 w-full sm:w-auto"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="lg"
                  className="min-h-12 w-full sm:w-auto"
                  disabled={createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                >
                  {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                  Create draft
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex flex-col gap-4 rounded-xl border bg-card/50 p-4 shadow-sm lg:flex-row lg:flex-wrap lg:items-end">
        <div className="min-w-[200px] flex-1 space-y-1">
          <Label htmlFor="inv-q">Search</Label>
          <Input
            id="inv-q"
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            placeholder="Invoice #, company…"
          />
        </div>
        <div className="w-full min-w-[180px] space-y-1 lg:w-52">
          <Label>Invoice status</Label>
          <Select
            value={searchParams.get("status") || "__any__"}
            onValueChange={(v) => setParam("status", v === "__any__" ? "" : v)}
          >
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full min-w-[180px] space-y-1 lg:w-52">
          <Label>Settlement</Label>
          <Select
            value={searchParams.get("settlement") || "__any__"}
            onValueChange={(v) => setParam("settlement", v === "__any__" ? "" : v)}
          >
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SETTLEMENT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
          <input
            id="overdue-only"
            type="checkbox"
            className="h-4 w-4"
            checked={overdueOnly}
            onChange={(e) => setParam("overdue", e.target.checked ? "1" : "")}
          />
          <Label htmlFor="overdue-only" className="cursor-pointer text-sm font-normal">
            Overdue only
          </Label>
        </div>
        <div className="grid w-full grid-cols-2 gap-3 lg:w-auto lg:min-w-[280px]">
          <div className="space-y-1">
            <Label htmlFor="idf">Issued from</Label>
            <Input
              id="idf"
              type="date"
              className="h-11"
              value={searchParams.get("date_from") ?? ""}
              onChange={(e) => setParam("date_from", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="idt">Issued to</Label>
            <Input
              id="idt"
              type="date"
              className="h-11"
              value={searchParams.get("date_to") ?? ""}
              onChange={(e) => setParam("date_to", e.target.value)}
            />
          </div>
        </div>
        <div className="w-full min-w-[220px] flex-1 space-y-1">
          <CompanyLookup
            label="Account"
            value={filterCompanyId}
            onChange={(id) => setParam("company_id", id ?? "")}
            nullable
            placeholder="All accounts"
          />
        </div>
        <p className="w-full text-xs text-muted-foreground lg:col-span-full">
          Search updates after a short pause. Status, settlement, and date filters apply immediately and jump back to page 1.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed bg-muted/30 p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-foreground">No invoices match these filters</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Widen the issued date range, clear the account filter, or issue an invoice from an order.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/invoices">Reset filters</Link>
            </Button>
            <Button type="button" onClick={() => setCreateOpen(true)}>
              New invoice
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <DataTable<InvoiceRow>
            columns={columns}
            data={rows}
            emptyLabel="No invoices on this page"
            emptyDescription="Adjust filters or issue an invoice from an order."
          />
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="text-muted-foreground">
          <span className="text-foreground">Page {page}</span>
          {invPag?.total_pages != null ? ` of ${invPag.total_pages}` : null}
          {invPag?.total !== undefined ? ` · ${invPag.total} invoices` : null}
          {invRangeCaptionText ? ` · ${invRangeCaptionText}` : null}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="lg" disabled={page <= 1} onClick={() => goPage(page - 1)}>
            Previous
          </Button>
          <Button type="button" variant="outline" size="lg" disabled={!hasMore && page >= totalPages} onClick={() => goPage(page + 1)}>
            Next
          </Button>
        </div>
      </div>
    </>
  );
}
