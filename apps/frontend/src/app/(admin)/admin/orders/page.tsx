"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { ColumnDef } from "@tanstack/react-table";
import { Loader2, Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import { OrderDetailResponseSchema, OrderRowSchema, PaginatedOrdersResponseSchema } from "@/lib/api/admin-orders-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { parseGbpInputToMinorUnits, formatGBP } from "@/lib/format/money";

import { BookingLookup, CompanyLookup } from "@/components/admin/lookups/AsyncEntityLookup";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/tables/DataTable";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OrderRow = z.infer<typeof OrderRowSchema>;

const createOrderSchema = z.object({
  company_id: z.string().uuid("Company must be a valid UUID."),
  booking_id: z.string().uuid("Booking must be a valid UUID."),
});

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
      return parsed.data.data.items;
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

      const detail = OrderDetailResponseSchema.safeParse(res.data);

      return detail.success ? detail.data.data : null;
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
        accessorKey: "company",
        header: "Account",
        cell: ({ row }) => <div className="font-medium">{row.original.company?.name ?? "—"}</div>,
      },
      {
        accessorKey: "status",
        header: "Order",
        cell: ({ row }) => (
          <div className="space-y-1">
            <StatusBadge kind="order" status={row.original.status} />
            <div className="text-xs text-muted-foreground">{row.original.scheduled_date ?? "—"}</div>
          </div>
        ),
      },
      {
        accessorKey: "payment_status",
        header: "Payment",
        cell: ({ row }) => <span className="text-sm capitalize">{row.original.payment_status ?? "—"}</span>,
      },
      {
        accessorKey: "knife_count",
        header: "Knives",
        cell: ({ row }) => <span className="tabular-nums">{row.original.knife_count ?? "—"}</span>,
      },
      {
        accessorKey: "total_pence",
        header: "Total",
        cell: ({ row }) => (
          <span className="tabular-nums">{formatGBP(row.original.total_pence ?? 0)}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/orders/${row.original.id}`}>Open</Link>
          </Button>
        ),
      },
    ],
    [],
  );

  const page = Number(searchParams.get("page") ?? "1");
  const prevHref = `/admin/orders?page=${Math.max(1, page - 1)}&per_page=${searchParams.get("per_page") ?? "20"}`;
  const nextHref = `/admin/orders?page=${page + 1}&per_page=${searchParams.get("per_page") ?? "20"}`;

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
          <Button className="mt-3" type="button" variant="outline" size="sm" onClick={() => void listQuery.refetch()}>
            Retry
          </Button>
        </div>
      </>
    );
  }

  const rows = (listQuery.data ?? []) as OrderRow[];

  return (
    <>
      <Breadcrumbs crumbs={[{ label: "Operations", href: "/admin/dashboard" }, { label: "Orders" }]} />
      <PageHeader
        title="Orders"
        description="Charges linked to bookings and per-blade workshop tracking."
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button type="button" className="gap-2">
                <Plus className="h-4 w-4" aria-hidden />
                New order
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create order</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  Requires a booking belonging to the same company. Prefer converting from a booking where possible.
                </p>
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
                <div className="space-y-1">
                  <Label htmlFor="ppp">Price per knife (£, optional, ex VAT)</Label>
                  <Input
                    id="ppp"
                    inputMode="decimal"
                    value={priceGbp}
                    onChange={(e) => setPriceGbp(e.target.value)}
                    placeholder="e.g. 12.00"
                  />
                </div>
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
        <p className="text-sm text-muted-foreground">No orders yet.</p>
      ) : (
        <DataTable<OrderRow> columns={columns} data={rows} emptyDescription="Create an order from a booking or use New order." />
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
