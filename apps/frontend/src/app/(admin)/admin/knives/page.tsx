"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { ColumnDef } from "@tanstack/react-table";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import { KnifeRowSchema, PaginatedKnivesResponseSchema } from "@/lib/api/admin-knives-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";

import { CompanyLookup, OrderLookup } from "@/components/admin/lookups/AsyncEntityLookup";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/tables/DataTable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type KnifeRow = z.infer<typeof KnifeRowSchema>;

const STATUS_OPTIONS = [
  "",
  "logged",
  "collected",
  "inspected",
  "sharpened",
  "quality_checked",
  "returned",
  "issue_reported",
] as const;

export default function AdminKnivesPage() {
  const admin = useAdminApi();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tagFilter = searchParams.get("tag_id") ?? "";
  const statusFilter = searchParams.get("status") ?? "";
  const companyFilter = searchParams.get("company_id") ?? "";
  const orderFilter = searchParams.get("order_id") ?? "";
  const qFilter = searchParams.get("q") ?? "";

  const [draftTag, setDraftTag] = useState(tagFilter);
  const [draftStatus, setDraftStatus] = useState(statusFilter);
  const [draftCompanyId, setDraftCompanyId] = useState<string | null>(
    companyFilter === "" ? null : companyFilter,
  );
  const [draftOrderId, setDraftOrderId] = useState<string | null>(orderFilter === "" ? null : orderFilter);
  const [draftQ, setDraftQ] = useState(qFilter);

  useEffect(() => {
    setDraftTag(tagFilter);
    setDraftStatus(statusFilter);
    setDraftCompanyId(companyFilter === "" ? null : companyFilter);
    setDraftOrderId(orderFilter === "" ? null : orderFilter);
    setDraftQ(qFilter);
  }, [tagFilter, statusFilter, companyFilter, orderFilter, qFilter]);

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
    queryKey: ["admin-knives", listKey],
    queryFn: async () => {
      const qs = listKey ? `?${listKey}` : "";
      const res = await admin.json<unknown>(`/api/admin/knives${qs}`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = PaginatedKnivesResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected knives payload.");
      }
      return parsed.data.data.items;
    },
  });

  useEffect(() => {
    if (listQuery.isError) {
      toast.error((listQuery.error as Error).message);
    }
  }, [listQuery.error, listQuery.isError]);

  const columns = useMemo<ColumnDef<KnifeRow>[]>(
    () => [
      {
        accessorKey: "tag_id",
        header: "Tag",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.tag_id}</span>,
      },
      {
        accessorKey: "company_name",
        header: "Account",
        cell: ({ row }) => row.original.company_name ?? "—",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge kind="knife" status={row.original.status} />,
      },
      {
        accessorKey: "knife_type",
        header: "Type",
        cell: ({ row }) => row.original.knife_type ?? "—",
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/knives/${row.original.id}`}>Open</Link>
          </Button>
        ),
      },
    ],
    [],
  );

  const applyFilters = useCallback(() => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("page", "1");

    const setOrDelete = (key: string, value: string) => {
      const v = value.trim();
      if (v) {
        p.set(key, v);
      } else {
        p.delete(key);
      }
    };

    setOrDelete("tag_id", draftTag);
    setOrDelete("status", draftStatus);
    setOrDelete("company_id", draftCompanyId ?? "");
    setOrDelete("order_id", draftOrderId ?? "");
    setOrDelete("q", draftQ);

    router.push(`${pathname}?${p.toString()}`);
  }, [draftCompanyId, draftOrderId, draftQ, draftStatus, draftTag, pathname, router, searchParams]);

  const page = Number(searchParams.get("page") ?? "1");

  const nextSearch = () => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("page", String(page + 1));

    return p.toString();
  };

  const prevSearch = () => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("page", String(Math.max(1, page - 1)));

    return p.toString();
  };

  if (listQuery.isPending) {
    return (
      <>
        <Breadcrumbs crumbs={[{ label: "Operations", href: "/admin/dashboard" }, { label: "Knives" }]} />
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        </div>
      </>
    );
  }

  if (listQuery.isError) {
    return (
      <>
        <Breadcrumbs crumbs={[{ label: "Operations", href: "/admin/dashboard" }, { label: "Knives" }]} />
        <PageHeader
          title="Knife tracking"
          description="Search by tag or free text; filter by account, order, or workshop status."
        />
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          <p className="font-medium text-destructive">{(listQuery.error as Error).message}</p>
          <Button className="mt-3" type="button" variant="outline" size="sm" onClick={() => void listQuery.refetch()}>
            Retry
          </Button>
        </div>
      </>
    );
  }

  const rows = (listQuery.data ?? []) as KnifeRow[];

  return (
    <>
      <Breadcrumbs crumbs={[{ label: "Operations", href: "/admin/dashboard" }, { label: "Knives" }]} />
      <PageHeader
        title="Knife tracking"
        description="Search by tag or free text; filter by account UUID, order UUID, or workshop status."
      />

      <div className="mb-6 grid gap-3 rounded-lg border border-border p-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="tag">Tag contains</Label>
          <Input id="tag" value={draftTag} onChange={(e) => setDraftTag(e.target.value)} placeholder="WS-…" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="q">Free text (q)</Label>
          <Input id="q" value={draftQ} onChange={(e) => setDraftQ(e.target.value)} placeholder="Description / label" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draftStatus}
            onChange={(e) => setDraftStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s || "all"} value={s}>
                {s ? s.replace(/_/g, " ") : "Any status"}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 md:col-span-2">
          <CompanyLookup
            label="Account"
            value={draftCompanyId}
            onChange={setDraftCompanyId}
            nullable
            placeholder="Filter by customer…"
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <OrderLookup
            label="Order"
            value={draftOrderId}
            onChange={setDraftOrderId}
            nullable
            placeholder="Filter by order…"
          />
        </div>
        <div className="flex items-end">
          <Button type="button" className="w-full md:w-auto" onClick={applyFilters}>
            Apply filters
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No knives match these filters.</p>
      ) : (
        <DataTable<KnifeRow> columns={columns} data={rows} />
      )}

      <div className="mt-4 flex gap-3 text-sm">
        <Link
          className={page <= 1 ? "pointer-events-none text-muted-foreground" : "text-primary underline"}
          href={`/admin/knives?${prevSearch()}`}
        >
          Previous
        </Link>
        <Link className="text-primary underline" href={`/admin/knives?${nextSearch()}`}>
          Next
        </Link>
      </div>
    </>
  );
}
