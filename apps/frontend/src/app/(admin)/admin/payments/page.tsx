"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";

import type { ColumnDef } from "@tanstack/react-table";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import { PaginatedPaymentsResponseSchema, PaymentRowSchema } from "@/lib/api/admin-payments-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { formatGBP } from "@/lib/format/money";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/status/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";

type PaymentRow = z.infer<typeof PaymentRowSchema>;

export default function AdminPaymentsPage() {
  const admin = useAdminApi();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
    ensure("per_page", "30");
    if (changed) {
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    }
  }, [pathname, router, searchParams]);

  const listKey = searchParams.toString();

  const listQuery = useQuery({
    queryKey: ["admin-payments", listKey],
    queryFn: async () => {
      const qs = listKey ? `?${listKey}` : "";
      const res = await admin.json<unknown>(`/api/admin/payments${qs}`);
      if (!res.ok) throw new Error(res.message);
      const parsed = PaginatedPaymentsResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected payments payload.");
      return parsed.data.data.items;
    },
  });

  useEffect(() => {
    if (listQuery.isError) toast.error((listQuery.error as Error).message);
  }, [listQuery.error, listQuery.isError]);

  const columns = useMemo<ColumnDef<PaymentRow>[]>(
    () => [
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => <span className="tabular-nums">{formatGBP(row.original.amount ?? 0)}</span>,
      },
      {
        accessorKey: "invoice",
        header: "Invoice",
        cell: ({ row }) =>
          row.original.invoice_id ? (
            <Link href={`/admin/invoices/${row.original.invoice_id}`} className="text-primary underline">
              {row.original.invoice?.invoice_number ?? row.original.invoice_id?.slice(0, 8)}
            </Link>
          ) : (
            "—"
          ),
      },
      {
        accessorKey: "method",
        header: "Method",
        cell: ({ row }) => (
          <span className="capitalize">{(row.original.method ?? "").replace(/_/g, " ") || "—"}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge kind="payment" status={row.original.status} />,
      },
      { accessorKey: "reference", header: "Ref.", cell: ({ row }) => <span className="font-mono text-xs">{row.original.reference ?? "—"}</span> },
    ],
    [],
  );

  const page = Number(searchParams.get("page") ?? "1");
  const prevHref = `/admin/payments?page=${Math.max(1, page - 1)}&per_page=${searchParams.get("per_page") ?? "30"}`;
  const nextHref = `/admin/payments?page=${page + 1}&per_page=${searchParams.get("per_page") ?? "30"}`;

  if (listQuery.isPending) {
    return (
      <>
        <Breadcrumbs crumbs={[{ label: "Operations", href: "/admin/dashboard" }, { label: "Payments" }]} />
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        </div>
      </>
    );
  }

  if (listQuery.isError) {
    return (
      <>
        <Breadcrumbs crumbs={[{ label: "Operations", href: "/admin/dashboard" }, { label: "Payments" }]} />
        <p className="text-sm text-destructive">{(listQuery.error as Error).message}</p>
      </>
    );
  }

  const rows = (listQuery.data ?? []) as PaymentRow[];

  return (
    <>
      <Breadcrumbs crumbs={[{ label: "Operations", href: "/admin/dashboard" }, { label: "Payments" }]} />
      <PageHeader
        title="Payments"
        description="Settlement rows (Stripe, FPS, adjustments). Manual entries require PAYMENTS.manage on the backend."
      />
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payments yet.</p>
      ) : (
        <DataTable<PaymentRow> columns={columns} data={rows} />
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
