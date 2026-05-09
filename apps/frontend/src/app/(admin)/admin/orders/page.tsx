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
  OrderRowSchema,
  PaginatedOrdersResponseSchema,
  unwrapAdminOrderDetailPayload,
} from "@/lib/api/admin-orders-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { paginationRangeCaption } from "@/lib/format/pagination-caption";
import { parseGbpInputToMinorUnits, formatGBP } from "@/lib/format/money";
import { orderPaymentStatusLabel } from "@/lib/helpers/status-helpers";

import { BookingLookup, CompanyLookup } from "@/components/admin/lookups/AsyncEntityLookup";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/tables/DataTable";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type OrderRow = z.infer<typeof OrderRowSchema>;

const createOrderSchema = z.object({
  company_id: z.string().uuid("Company must be a valid UUID."),
  booking_id: z.string().uuid("Booking must be a valid UUID."),
});

const ORDER_STATUS_OPTIONS = [
  { value: "", label: "Any order status" },
  { value: "draft", label: "Draft" },
  { value: "received", label: "Received" },
  { value: "inspection", label: "Inspection" },
  { value: "in_progress", label: "In progress" },
  { value: "quality_check", label: "Quality check" },
  { value: "completed", label: "Completed" },
  { value: "invoiced", label: "Invoiced" },
  { value: "returned", label: "Returned" },
  { value: "cancelled", label: "Cancelled" },
];

const PAYMENT_OPTIONS = [
  { value: "", label: "Any payment" },
  { value: "unpaid", label: "Unpaid" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "waived", label: "Waived" },
  { value: "refunded", label: "Refunded" },
];

const INVOICE_FILTER_OPTIONS = [
  { value: "", label: "Any invoice" },
  { value: "none", label: "No invoice on file" },
  { value: "draft", label: "Invoice: draft" },
  { value: "sent", label: "Invoice: sent" },
  { value: "paid", label: "Invoice: paid" },
  { value: "overdue", label: "Invoice: overdue" },
];

export default function AdminOrdersPage() {
  const admin = useAdminApi();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [priceGbp, setPriceGbp] = useState("");

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
    ensure("per_page", "20");
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
    queryKey: ["admin-orders", listKey],
    queryFn: async () => {
      const qs = listKey ? `?${listKey}` : "";
      const res = await admin.json<unknown>(`/api/admin/orders${qs}`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = PaginatedOrdersResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected orders payload.");
      }
      return {
        items: parsed.data.data.items,
        pagination: parsed.data.meta?.pagination,
      };
    },
  });

  useEffect(() => {
    if (listQuery.isError) {
      toast.error((listQuery.error as Error).message);
    }
  }, [listQuery.error, listQuery.isError]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const ids = createOrderSchema.safeParse({
        company_id: (companyId ?? "").trim(),
        booking_id: (bookingId ?? "").trim(),
      });
      if (!ids.success) {
        throw new Error(ids.error.issues[0]?.message ?? "Invalid form.");
      }

      let pence: number | undefined;

      try {
        pence = parseGbpInputToMinorUnits(priceGbp);
      } catch (e: unknown) {
        throw new Error(e instanceof Error ? e.message : "Invalid price.");
      }

      const body: Record<string, unknown> = {
        company_id: ids.data.company_id,
        booking_id: ids.data.booking_id,
        knife_count: 0,
        discount_pence: 0,
        subtotal_pence: 0,
        tax_pence: 0,
        total_pence: 0,
      };

      if (pence !== undefined) {
        body.price_per_knife_pence = pence;
      }

      const res = await admin.json<unknown>("/api/admin/orders", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(res.message);
      }

      const detail = unwrapAdminOrderDetailPayload(res.data);

      return detail;
    },
    onSuccess: (order) => {
      toast.success("Order created.");
      void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      setCreateOpen(false);
      setCompanyId(null);
      setBookingId(null);
      setPriceGbp("");
      if (order?.id) {
        router.push(`/admin/orders/${order.id}`);
      }
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Create failed.");
    },
  });

  const columns = useMemo<ColumnDef<OrderRow>[]>(
    () => [
      {
        id: "reference",
        header: "Order",
        cell: ({ row }) => {
          const ref = row.original.reference ?? "Order";
          return (
            <div className="space-y-1">
              <Link
                className="text-base font-semibold text-primary underline underline-offset-2"
                href={`/admin/orders/${row.original.id}`}
              >
                {ref}
              </Link>
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                <span>{row.original.company?.name ?? "—"}</span>
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
        id: "booking",
        header: "Booking",
        cell: ({ row }) => {
          const b = row.original.booking;
          if (!b?.id) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }
          return (
            <Link className="text-sm font-medium text-primary underline" href={`/admin/bookings/${b.id}`}>
              {b.reference}
            </Link>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <StatusBadge kind="order" status={row.original.status} />
            <span className="text-xs text-muted-foreground">{orderPaymentStatusLabel(row.original.payment_status)}</span>
          </div>
        ),
      },
      {
        id: "counts",
        header: "Lines / blades",
        cell: ({ row }) => {
          const lines = row.original.billable_lines_count;
          const blades = row.original.knives_registered_count ?? row.original.knife_count;
          return (
            <span className="tabular-nums text-sm">
              {lines ?? 0} lines · {blades ?? 0} blades
            </span>
          );
        },
      },
      {
        accessorKey: "total_pence",
        header: "Total",
        cell: ({ row }) => (
          <span className="text-base font-medium tabular-nums">{formatGBP(row.original.total_pence ?? 0)}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button asChild variant="default" size="default" className="min-w-[7rem]">
            <Link href={`/admin/orders/${row.original.id}`}>Open order</Link>
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

  if (listQuery.status === "pending") {
    return (
      <>
        <Breadcrumbs crumbs={[{ label: "Operations", href: "/admin/dashboard" }, { label: "Orders" }]} />
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        </div>
      </>
    );
  }

  if (listQuery.isError) {
    return (
      <>
        <Breadcrumbs crumbs={[{ label: "Operations", href: "/admin/dashboard" }, { label: "Orders" }]} />
        <PageHeader title="Orders" description="Charges linked to bookings and per-blade workshop tracking." />
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
  const orderPag = listQuery.data?.pagination;
  const orderRangeCaptionText = orderPag ? paginationRangeCaption(page, orderPag.per_page, orderPag.total) : null;

  return (
    <>
      <Breadcrumbs crumbs={[{ label: "Operations", href: "/admin/dashboard" }, { label: "Orders" }]} />
      <PageHeader
        title="Orders"
        description="Workshop desk — open a booking’s order in two picks; search and manage fulfilment below."
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button type="button" size="lg" className="gap-2">
                <Plus className="h-4 w-4" aria-hidden />
                New order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[min(90vh,calc(100dvh-2rem))] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New order from booking</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">Account, then booking — both must match. Skip price to use defaults.</p>
                <CompanyLookup
                  label="Account"
                  value={companyId}
                  onChange={(id) => {
                    setCompanyId(id);
                    setBookingId(null);
                  }}
                  placeholder="Search kitchen / company…"
                />
                <BookingLookup
                  label="Booking"
                  value={bookingId}
                  onChange={setBookingId}
                  disabled={!companyId}
                  extraParams={companyId ? { company_id: companyId } : undefined}
                  placeholder={companyId ? "Search bookings for this account…" : "Select an account first"}
                />
                <details className="rounded-lg border border-border/80 bg-muted/20 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="cursor-pointer px-3 py-2.5 text-sm font-medium text-foreground">
                    Price per knife — optional (£ ex VAT)
                  </summary>
                  <div className="border-t border-border/80 px-3 pb-3 pt-2">
                    <Label htmlFor="ppp" className="sr-only">
                      Price per knife (£, ex VAT)
                    </Label>
                    <Input
                      id="ppp"
                      inputMode="decimal"
                      className="h-11"
                      value={priceGbp}
                      onChange={(e) => setPriceGbp(e.target.value)}
                      placeholder="e.g. 12.00 — leave empty for default"
                    />
                  </div>
                </details>
              </div>
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
                  Create order
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex flex-col gap-4 rounded-xl border bg-card/50 p-4 shadow-sm md:flex-row md:flex-wrap md:items-end">
        <div className="min-w-[200px] flex-1 space-y-1">
          <Label htmlFor="order-q">Search</Label>
          <Input
            id="order-q"
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            placeholder="Company, tag, label…"
          />
        </div>
        <div className="w-full min-w-[160px] space-y-1 md:w-48">
          <Label>Order status</Label>
          <Select
            value={searchParams.get("status") || "__any__"}
            onValueChange={(v) => setParam("status", v === "__any__" ? "" : v)}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value || "any"} value={o.value || "__any__"}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full min-w-[160px] space-y-1 md:w-48">
          <Label>Payment</Label>
          <Select
            value={searchParams.get("payment_status") || "__any__"}
            onValueChange={(v) => setParam("payment_status", v === "__any__" ? "" : v)}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_OPTIONS.map((o) => (
                <SelectItem key={o.value || "any-pay"} value={o.value || "__any__"}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full min-w-[180px] space-y-1 md:w-52">
          <Label>Invoice</Label>
          <Select
            value={searchParams.get("invoice_status") || "__any__"}
            onValueChange={(v) => setParam("invoice_status", v === "__any__" ? "" : v)}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Invoice" />
            </SelectTrigger>
            <SelectContent>
              {INVOICE_FILTER_OPTIONS.map((o) => (
                <SelectItem key={o.value || "any-inv"} value={o.value || "__any__"}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid w-full grid-cols-2 gap-3 md:w-auto md:min-w-[280px]">
          <div className="space-y-1">
            <Label htmlFor="df">From</Label>
            <Input
              id="df"
              type="date"
              className="h-11"
              value={searchParams.get("date_from") ?? ""}
              onChange={(e) => setParam("date_from", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dt">To</Label>
            <Input
              id="dt"
              type="date"
              className="h-11"
              value={searchParams.get("date_to") ?? ""}
              onChange={(e) => setParam("date_to", e.target.value)}
            />
          </div>
        </div>
        <div className="w-full min-w-[220px] flex-1 space-y-1">
          <CompanyLookup
            label="Account filter"
            value={filterCompanyId}
            onChange={(id) => setParam("company_id", id ?? "")}
            nullable
            placeholder="All accounts"
          />
        </div>
        <p className="w-full text-xs text-muted-foreground md:col-span-full">
          Search updates after a short pause while you type. Other filters apply immediately and reset to page 1.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed bg-muted/30 p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-foreground">No orders match these filters</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Widen the date range, clear the account filter, or create a workshop order from a booking.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/orders">Reset filters</Link>
            </Button>
            <Button type="button" onClick={() => setCreateOpen(true)}>
              New order
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <DataTable<OrderRow> columns={columns} data={rows} emptyDescription="Adjust filters or create an order." />
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="text-muted-foreground">
          <span className="text-foreground">Page {page}</span>
          {orderPag?.total_pages != null ? ` of ${orderPag.total_pages}` : null}
          {orderPag?.total !== undefined ? ` · ${orderPag.total} orders` : null}
          {orderRangeCaptionText ? ` · ${orderRangeCaptionText}` : null}
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
