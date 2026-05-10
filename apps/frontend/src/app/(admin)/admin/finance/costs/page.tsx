"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { ColumnDef } from "@tanstack/react-table";
import { Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { z } from "zod";

import {
  CostCategoriesResponseSchema,
  CostCategoryRowSchema,
  CostItemMutationResponseSchema,
  CostItemRowSchema,
  PaginatedCostItemsResponseSchema,
} from "@/lib/api/admin-cost-catalog-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { formatGBP } from "@/lib/format/money";
import { useBackendMe } from "@/hooks/use-backend-me";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/tables/DataTable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type CostItemRow = z.infer<typeof CostItemRowSchema>;
type CostCategoryRow = z.infer<typeof CostCategoryRowSchema>;

const STATUS_VALUES: { value: string; label: string }[] = [
  { value: "__all", label: "Any status (hide archived)" },
  { value: "purchased", label: "Purchased" },
  { value: "to_order", label: "To order" },
  { value: "pending_quote", label: "Pending quote" },
  { value: "deferred", label: "Deferred" },
  { value: "active", label: "Active" },
  { value: "to_arrange", label: "To arrange" },
  { value: "reserve", label: "Reserve" },
  { value: "to_research", label: "To research" },
  { value: "cancelled", label: "Cancelled" },
  { value: "archived", label: "Archived only" },
];

const FREQUENCY_VALUES: { value: string; label: string }[] = [
  { value: "__all", label: "Any frequency" },
  { value: "one_time", label: "One-time" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
  { value: "per_route", label: "Per route" },
  { value: "per_order", label: "Per order" },
  { value: "per_knife", label: "Per knife" },
  { value: "usage_based", label: "Usage-based" },
];

function gbpToPence(raw: string): number | null {
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export default function AdminCostCataloguePage() {
  const admin = useAdminApi();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const me = useBackendMe();

  const permissions = useMemo(() => new Set(me.data?.data?.permissions ?? []), [me.data?.data?.permissions]);
  const canManage = permissions.has("costs.manage");

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
    ensure("per_page", "50");
    if (changed) {
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    }
  }, [pathname, router, searchParams]);

  const listKey = searchParams.toString();

  const categoriesQuery = useQuery({
    queryKey: ["admin-cost-categories"],
    queryFn: async () => {
      const res = await admin.json<unknown>("/api/admin/cost-categories");
      if (!res.ok) throw new Error(res.message);
      const parsed = CostCategoriesResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected categories payload.");
      return parsed.data.data.items;
    },
  });

  const itemsQuery = useQuery({
    queryKey: ["admin-cost-items", listKey],
    queryFn: async () => {
      const qs = listKey ? `?${listKey}` : "";
      const res = await admin.json<unknown>(`/api/admin/cost-items${qs}`);
      if (!res.ok) throw new Error(res.message);
      const parsed = PaginatedCostItemsResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected cost items payload.");
      return parsed.data;
    },
  });

  useEffect(() => {
    if (itemsQuery.isError) toast.error((itemsQuery.error as Error).message);
  }, [itemsQuery.error, itemsQuery.isError]);

  const setFilter = useCallback(
    (patch: Record<string, string>) => {
      const p = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([k, v]) => {
        if (v === "") p.delete(k);
        else p.set(k, v);
      });
      if (!Object.keys(patch).includes("page")) {
        p.set("page", "1");
      }
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editId, setEditId] = useState<string | null>(null);
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formName, setFormName] = useState("");
  const [formAmountGbp, setFormAmountGbp] = useState("");
  const [formFrequency, setFormFrequency] = useState("one_time");
  const [formStatus, setFormStatus] = useState("to_order");
  const [formTier, setFormTier] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formConsumable, setFormConsumable] = useState(false);

  const [archiveTarget, setArchiveTarget] = useState<CostItemRow | null>(null);

  const openCreate = useCallback(() => {
    const first = categoriesQuery.data?.[0]?.id ?? "";
    setDialogMode("create");
    setEditId(null);
    setFormCategoryId(first);
    setFormName("");
    setFormAmountGbp("");
    setFormFrequency("one_time");
    setFormStatus("to_order");
    setFormTier("");
    setFormNotes("");
    setFormConsumable(false);
    setDialogOpen(true);
  }, [categoriesQuery.data]);

  const openEdit = useCallback((row: CostItemRow) => {
    setDialogMode("edit");
    setEditId(row.id);
    setFormCategoryId(row.category_id);
    setFormName(row.name);
    setFormAmountGbp((row.amount_pence / 100).toFixed(2));
    setFormFrequency(row.frequency);
    setFormStatus(row.status);
    setFormTier(row.tier_label ?? "");
    setFormNotes(row.notes ?? "");
    setFormConsumable(row.is_consumable);
    setDialogOpen(true);
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const pence = gbpToPence(formAmountGbp.trim());
      if (pence === null) {
        throw new Error("Enter a valid GBP amount (0 or more).");
      }
      if (!formCategoryId) {
        throw new Error("Pick a category.");
      }
      const body = {
        category_id: formCategoryId,
        name: formName.trim(),
        amount_pence: pence,
        frequency: formFrequency,
        status: formStatus,
        tier_label: formTier.trim() === "" ? null : formTier.trim(),
        notes: formNotes.trim() === "" ? null : formNotes.trim(),
        is_consumable: formConsumable,
      };
      if (dialogMode === "create") {
        const res = await admin.json<unknown>("/api/admin/cost-items", {
          method: "POST",
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(res.message);
        const parsed = CostItemMutationResponseSchema.safeParse(res.data);
        if (!parsed.success) throw new Error("Unexpected create response.");
        return parsed.data;
      }
      if (!editId) throw new Error("Missing item.");
      const res = await admin.json<unknown>(`/api/admin/cost-items/${editId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(res.message);
      const parsed = CostItemMutationResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected update response.");
      return parsed.data;
    },
    onSuccess: async () => {
      toast.success(dialogMode === "create" ? "Cost item created." : "Cost item updated.");
      setDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-cost-items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await admin.json<unknown>(`/api/admin/cost-items/${id}/archive`, { method: "POST", body: "{}" });
      if (!res.ok) throw new Error(res.message);
      const parsed = CostItemMutationResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected archive response.");
      return parsed.data;
    },
    onSuccess: async () => {
      toast.success("Item archived.");
      setArchiveTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-cost-items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = itemsQuery.data?.data.items ?? [];

  const columns = useMemo<ColumnDef<CostItemRow>[]>(() => {
    const base: ColumnDef<CostItemRow>[] = [
      {
        accessorKey: "name",
        header: "Item",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <span className="font-medium text-foreground">{row.original.name}</span>
            {row.original.tier_label ? (
              <span className="text-xs text-muted-foreground">Tier: {row.original.tier_label}</span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => <span className="text-sm">{row.original.category?.name ?? "—"}</span>,
      },
      {
        accessorKey: "formatted_amount",
        header: "Amount",
        cell: ({ row }) => <span className="tabular-nums">{formatGBP(row.original.amount_pence)}</span>,
      },
      {
        accessorKey: "frequency_label",
        header: "Frequency",
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.frequency_label}
            {row.original.is_recurring ? (
              <Badge variant="secondary" className="ml-2 text-[10px]">
                Recurring
              </Badge>
            ) : (
              <Badge variant="outline" className="ml-2 text-[10px]">
                One-off
              </Badge>
            )}
          </span>
        ),
      },
      {
        accessorKey: "status_label",
        header: "Status",
        cell: ({ row }) => <span className="text-sm">{row.original.status_label}</span>,
      },
      {
        id: "source",
        header: "Source",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.is_seeded ? (
              <Badge variant="secondary" className="text-[10px]">
                Seeded
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">
                Manual
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground">{row.original.source}</span>
          </div>
        ),
      },
    ];
    if (!canManage) {
      return base;
    }
    base.push({
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label="Edit cost item"
            onClick={() => openEdit(row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive"
            aria-label="Archive cost item"
            disabled={row.original.status === "archived"}
            onClick={() => setArchiveTarget(row.original)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    });
    return base;
  }, [canManage, openEdit]);

  const page = Number(searchParams.get("page") ?? "1");
  const perPage = Number(searchParams.get("per_page") ?? "50");
  const pag = itemsQuery.data?.meta?.pagination as { total_pages?: number } | undefined;
  const totalPages = typeof pag?.total_pages === "number" ? pag.total_pages : 1;

  const prevHref = `${pathname}?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), page: String(Math.max(1, page - 1)), per_page: String(perPage) }).toString()}`;
  const nextHref = `${pathname}?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), page: String(page + 1), per_page: String(perPage) }).toString()}`;

  if (itemsQuery.isPending || categoriesQuery.isPending) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        <span className="text-sm">Loading cost catalogue…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Finance", href: "/admin/finance" },
          { label: "Cost catalogue" },
        ]}
      />
      <PageHeader
        title="Cost catalogue"
        description="Your internal cost plan — amounts are stored in GBP on the server."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" className="rounded-lg" asChild>
              <Link href="/admin/finance/costs/import">
                <Upload className="mr-1.5 h-4 w-4" aria-hidden />
                Import spreadsheet
              </Link>
            </Button>
            {canManage ? (
              <Button type="button" size="sm" className="rounded-lg" onClick={openCreate}>
                <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                Add item
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
        <div className="grid gap-1">
          <Label htmlFor="cost-filter-cat">Category</Label>
          <Select
            value={searchParams.get("category_slug") ?? "__all"}
            onValueChange={(v) => setFilter({ category_slug: v === "__all" ? "" : v })}
          >
            <SelectTrigger id="cost-filter-cat" className="w-[200px] rounded-lg">
              <SelectValue placeholder="Any category" />
            </SelectTrigger>
            <SelectContent className="rounded-lg">
              <SelectItem value="__all">Any category</SelectItem>
              {(categoriesQuery.data ?? []).map((c: CostCategoryRow) => (
                <SelectItem key={c.id} value={c.slug}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="cost-filter-status">Status</Label>
          <Select
            value={searchParams.get("status") && searchParams.get("status") !== "" ? String(searchParams.get("status")) : "__all"}
            onValueChange={(v) => setFilter({ status: v === "__all" ? "" : v })}
          >
            <SelectTrigger id="cost-filter-status" className="w-[220px] rounded-lg">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-lg">
              {STATUS_VALUES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="cost-filter-frequency">Frequency</Label>
          <Select
            value={
              searchParams.get("frequency") && searchParams.get("frequency") !== ""
                ? String(searchParams.get("frequency"))
                : "__all"
            }
            onValueChange={(v) => setFilter({ frequency: v === "__all" ? "" : v })}
          >
            <SelectTrigger id="cost-filter-frequency" className="w-[200px] rounded-lg">
              <SelectValue placeholder="Frequency" />
            </SelectTrigger>
            <SelectContent className="rounded-lg">
              {FREQUENCY_VALUES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="cost-filter-q">Search</Label>
          <Input
            id="cost-filter-q"
            className="w-[200px] rounded-lg"
            placeholder="Name contains…"
            defaultValue={searchParams.get("q") ?? ""}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setFilter({ q: (e.target as HTMLInputElement).value.trim() });
              }
            }}
          />
        </div>
        <div className="flex items-center gap-2 pb-2">
          <Button
            type="button"
            size="sm"
            variant={searchParams.get("include_archived") === "1" ? "secondary" : "outline"}
            className="rounded-lg"
            onClick={() =>
              setFilter({ include_archived: searchParams.get("include_archived") === "1" ? "" : "1" })
            }
          >
            Include archived
          </Button>
        </div>
      </div>

      <DataTable columns={columns} data={rows} />

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <div>
          Page {page} of {totalPages}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-lg" disabled={page <= 1} asChild>
            <Link href={prevHref}>Previous</Link>
          </Button>
          <Button variant="outline" size="sm" className="rounded-lg" disabled={page >= totalPages} asChild>
            <Link href={nextHref}>Next</Link>
          </Button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? "Add cost item" : "Edit cost item"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1">
              <Label htmlFor="cost-form-cat">Category</Label>
              <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                <SelectTrigger id="cost-form-cat" className="rounded-lg">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  {(categoriesQuery.data ?? []).map((c: CostCategoryRow) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="cost-form-name">Name</Label>
              <Input id="cost-form-name" className="rounded-lg" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="cost-form-amt">Amount (GBP)</Label>
              <Input
                id="cost-form-amt"
                className="rounded-lg tabular-nums"
                inputMode="decimal"
                value={formAmountGbp}
                onChange={(e) => setFormAmountGbp(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label>Frequency</Label>
              <Select value={formFrequency} onValueChange={setFormFrequency}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  {FREQUENCY_VALUES.filter((f) => f.value !== "__all").map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label>Status</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  {STATUS_VALUES.filter((s) => s.value !== "__all" && s.value !== "archived").map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="cost-form-tier">Tier label (optional)</Label>
              <Input id="cost-form-tier" className="rounded-lg" value={formTier} onChange={(e) => setFormTier(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="cost-form-notes">Notes</Label>
              <Textarea id="cost-form-notes" className="rounded-lg" rows={3} value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={formConsumable ? "secondary" : "outline"}
                className="rounded-lg"
                onClick={() => setFormConsumable(!formConsumable)}
              >
                Consumable / stock item
              </Button>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="rounded-lg" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="rounded-lg" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={archiveTarget !== null} onOpenChange={(o) => !o && setArchiveTarget(null)}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this cost item?</AlertDialogTitle>
            <AlertDialogDescription>
              Archived rows are hidden from default lists but remain in the database for audit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={archiveMutation.isPending || !archiveTarget}
              onClick={() => archiveTarget && archiveMutation.mutate(archiveTarget.id)}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
