"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { ColumnDef } from "@tanstack/react-table";
import { Loader2, Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type KnifeRow = z.infer<typeof KnifeRowSchema>;

const STATUS_OPTIONS = [
  "",
  "logged",
  "received",
  "inspected",
  "sharpening",
  "sharpened",
  "quality_checked",
  "returned",
  "cancelled",
  "issue_reported",
] as const;

export default function AdminKnivesPage() {
  const admin = useAdminApi();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tagFilter = searchParams.get("tag_id") ?? "";
  const statusFilter = searchParams.get("status") ?? "";
  const companyFilter = searchParams.get("company_id") ?? "";
  const orderFilter = searchParams.get("order_id") ?? "";
  const qFilter = searchParams.get("q") ?? "";
  const knifeTypeFilter = searchParams.get("knife_type") ?? "";
  const unassignedOnly = searchParams.get("unassigned_only") === "1";

  const [draftTag, setDraftTag] = useState(tagFilter);
  const [draftStatus, setDraftStatus] = useState(statusFilter);
  const [draftCompanyId, setDraftCompanyId] = useState<string | null>(
    companyFilter === "" ? null : companyFilter,
  );
  const [draftOrderId, setDraftOrderId] = useState<string | null>(orderFilter === "" ? null : orderFilter);
  const [draftQ, setDraftQ] = useState(qFilter);
  const [draftKnifeType, setDraftKnifeType] = useState(knifeTypeFilter);
  const [draftUnassignedOnly, setDraftUnassignedOnly] = useState(unassignedOnly);

  const [registerOpen, setRegisterOpen] = useState(false);
  const [regCompanyId, setRegCompanyId] = useState<string | null>(null);
  const [regLabel, setRegLabel] = useState("");
  const [regKnifeType, setRegKnifeType] = useState("");
  const [regBrand, setRegBrand] = useState("");
  const [regNotes, setRegNotes] = useState("");
  const [regCondition, setRegCondition] = useState("");

  useEffect(() => {
    setDraftTag(tagFilter);
    setDraftStatus(statusFilter);
    setDraftCompanyId(companyFilter === "" ? null : companyFilter);
    setDraftOrderId(orderFilter === "" ? null : orderFilter);
    setDraftQ(qFilter);
    setDraftKnifeType(knifeTypeFilter);
    setDraftUnassignedOnly(unassignedOnly);
  }, [tagFilter, statusFilter, companyFilter, orderFilter, qFilter, knifeTypeFilter, unassignedOnly]);

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

  const registerMutation = useMutation({
    mutationFn: async () => {
      if (!regCompanyId) {
        throw new Error("Choose a customer account.");
      }
      const res = await admin.json(`/api/admin/knives`, {
        method: "POST",
        body: JSON.stringify({
          company_id: regCompanyId,
          label: regLabel.trim() || undefined,
          knife_type: regKnifeType.trim() || undefined,
          brand: regBrand.trim() || undefined,
          notes: regNotes.trim() || undefined,
          condition_before: regCondition.trim() || undefined,
        }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data as { data?: { id?: string } };
    },
    onSuccess: (data) => {
      toast.success("Knife registered to inventory.");
      setRegisterOpen(false);
      setRegLabel("");
      setRegKnifeType("");
      setRegBrand("");
      setRegNotes("");
      setRegCondition("");
      void queryClient.invalidateQueries({ queryKey: ["admin-knives"] });
      const id = data?.data?.id;
      if (typeof id === "string" && id.length > 0) {
        router.push(`/admin/knives/${id}`);
      }
    },
    onError: (e: Error) => toast.error(e.message),
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
        accessorKey: "label",
        header: "Label",
        cell: ({ row }) => row.original.label ?? "—",
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
    setOrDelete("knife_type", draftKnifeType);

    if (draftUnassignedOnly) {
      p.set("unassigned_only", "1");
    } else {
      p.delete("unassigned_only");
    }

    router.push(`${pathname}?${p.toString()}`);
  }, [
    draftCompanyId,
    draftOrderId,
    draftQ,
    draftStatus,
    draftTag,
    draftKnifeType,
    draftUnassignedOnly,
    pathname,
    router,
    searchParams,
  ]);

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
          description="Search by tag or free text; filter by account, order, type, or workshop status."
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Knife tracking"
          description="Customer-owned blades: search by tag or label, filter by account (lookup), order, exact type, or status. Register inventory without an order."
        />
        <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
          <DialogTrigger asChild>
            <Button type="button" className="shrink-0 gap-2 self-start">
              <Plus className="h-4 w-4" aria-hidden />
              Register knife
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Register inventory knife</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <CompanyLookup
                label="Customer account"
                value={regCompanyId}
                onChange={setRegCompanyId}
                placeholder="Who owns this blade?"
              />
              <div>
                <Label htmlFor="reg-label">Label / name</Label>
                <Input id="reg-label" value={regLabel} onChange={(e) => setRegLabel(e.target.value)} placeholder="Readable name" />
              </div>
              <div>
                <Label htmlFor="reg-type">Type</Label>
                <Input id="reg-type" value={regKnifeType} onChange={(e) => setRegKnifeType(e.target.value)} placeholder="e.g. chefs" />
              </div>
              <div>
                <Label htmlFor="reg-brand">Brand (optional)</Label>
                <Input id="reg-brand" value={regBrand} onChange={(e) => setRegBrand(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="reg-condition">Condition / status notes</Label>
                <Input id="reg-condition" value={regCondition} onChange={(e) => setRegCondition(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="reg-notes">Notes</Label>
                <Input id="reg-notes" value={regNotes} onChange={(e) => setRegNotes(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">Tag ID is allocated when you save. The knife stays unassigned until linked to an order.</p>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setRegisterOpen(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={registerMutation.isPending} onClick={() => registerMutation.mutate()}>
                {registerMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                Save knife
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

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
          <Label htmlFor="knife_type">Type (exact)</Label>
          <Input
            id="knife_type"
            value={draftKnifeType}
            onChange={(e) => setDraftKnifeType(e.target.value)}
            placeholder="Matches knife_type field"
          />
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
        <div className="flex items-center gap-2 pt-6 md:col-span-2">
          <input
            id="unassigned"
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={draftUnassignedOnly}
            onChange={(e) => setDraftUnassignedOnly(e.target.checked)}
          />
          <Label htmlFor="unassigned" className="font-normal">
            Unassigned only (no order)
          </Label>
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
