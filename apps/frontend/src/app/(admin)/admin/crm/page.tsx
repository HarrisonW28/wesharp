"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { CompanyRow } from "@/lib/api/admin-crm-schema";
import type { CompanyStatus } from "@/lib/api/admin-crm-schema";
import { PaginatedCompaniesResponseSchema } from "@/lib/api/admin-crm-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { formatGbpFromPence } from "@/lib/format/money";

import { CompanyStatusBadge } from "@/components/crm/CompanyStatusBadge";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/tables/DataTable";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SORTS = ["name", "total_spend", "last_booking", "city"] as const;

const STATUS_FILTERS: { label: string; value: CompanyStatus | "all" }[] = [
  { label: "All statuses", value: "all" },
  { label: "Lead", value: "lead" },
  { label: "Trial booked", value: "trial_booked" },
  { label: "Trial completed", value: "trial_completed" },
  { label: "Active", value: "active" },
  { label: "At risk", value: "at_risk" },
  { label: "Lost", value: "lost" },
];

const createCompanySchema = z.object({
  name: z.string().min(2, "Name is required."),
});

export default function AdminCrmPage() {
  const admin = useAdminApi();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(searchParams.toString());
    let changed = false;
    const ensure = (k: string, v: string) => {
      if (!p.has(k)) {
        p.set(k, v);
        changed = true;
      }
    };
    ensure("page", "1");
    ensure("per_page", "15");
    ensure("sort", "name");
    ensure("direction", "asc");

    if (changed) {
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    }
  }, [pathname, router, searchParams]);

  const listQueryKey = searchParams.toString();

  const queryClient = useQueryClient();

  const companiesQuery = useQuery({
    queryKey: ["admin-companies", listQueryKey],
    queryFn: async () => {
      const qs = listQueryKey ? `?${listQueryKey}` : "";
      const res = await admin.json<unknown>(`/api/admin/companies${qs}`);
      if (!res.ok) {
        throw new Error(res.message);
      }

      const parsed = PaginatedCompaniesResponseSchema.safeParse(res.data);

      if (!parsed.success) {
        throw new Error("Unexpected CRM list response.");
      }

      return parsed.data;
    },
  });

  const form = useForm<z.infer<typeof createCompanySchema>>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: { name: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: z.infer<typeof createCompanySchema>) => {
      const res = await admin.json(`/api/admin/companies`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Account created.");
      await queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
      form.reset({ name: "" });
      setCreateOpen(false);
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Create failed.");
    },
  });

  const updateParam = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(searchParams.toString());
      mutate(p);

      router.replace(`${pathname}?${p.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const q = companiesQuery.data;

  const columns: ColumnDef<CompanyRow>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Account",
        cell: ({ row }) => (
          <Link className="font-medium text-primary hover:underline" href={`/admin/crm/${row.original.id}`}>
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: "city",
        header: "City",
        cell: ({ row }) => row.original.city ?? "—",
      },
      {
        accessorKey: "company_status",
        header: "Status",
        cell: ({ row }) => <CompanyStatusBadge status={row.original.company_status} />,
      },
      {
        id: "spend",
        header: "Total spend",
        cell: ({ row }) => <span className="tabular-nums">{formatGbpFromPence(row.original.total_spend_pence)}</span>,
      },
      {
        id: "last",
        header: "Last booking",
        cell: ({ row }) => <span>{row.original.last_booking_date ?? "—"}</span>,
      },
    ],
    [],
  );

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "CRM" }]} />
      <PageHeader
        title="Accounts"
        description="Operational CRM — sourced from Laravel /api/admin/companies."
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            New account
          </Button>
        }
      />

      <section className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm md:p-6">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="q">
              Search
            </label>
            <Input
              id="q"
              defaultValue={searchParams.get("q") ?? ""}
              placeholder="Name, slug, billing email…"
              onChange={(event) =>
                updateParam((params) => {
                  const v = event.target.value.trim();
                  if (v) {
                    params.set("q", v);
                  } else {
                    params.delete("q");
                  }
                  params.set("page", "1");
                })
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="city">
              City (exact)
            </label>
            <Input
              id="city"
              defaultValue={searchParams.get("city") ?? ""}
              placeholder="Manchester"
              onChange={(event) =>
                updateParam((params) => {
                  const v = event.target.value.trim();
                  if (v) {
                    params.set("city", v);
                  } else {
                    params.delete("city");
                  }
                  params.set("page", "1");
                })
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="status">
              Status
            </label>
            <Select
              value={searchParams.get("status") ?? "all"}
              onValueChange={(value) =>
                updateParam((params) => {
                  if (value === "all") {
                    params.delete("status");
                  } else {
                    params.set("status", value);
                  }
                  params.set("page", "1");
                })
              }
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((row) => (
                  <SelectItem key={row.value} value={row.value}>
                    {row.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="sort">
              Sort by
            </label>
            <Select
              value={(searchParams.get("sort") as (typeof SORTS)[number]) ?? "name"}
              onValueChange={(value) =>
                updateParam((params) => {
                  params.set("sort", value);
                  params.set("page", "1");
                })
              }
            >
              <SelectTrigger id="sort">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="direction">
              Direction
            </label>
            <Select
              value={searchParams.get("direction") ?? "asc"}
              onValueChange={(value) =>
                updateParam((params) => {
                  params.set("direction", value);
                  params.set("page", "1");
                })
              }
            >
              <SelectTrigger id="direction">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {companiesQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading accounts…
        </div>
      ) : companiesQuery.isError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {companiesQuery.error instanceof Error ? companiesQuery.error.message : "Unable to load CRM data."}
        </div>
      ) : (
        <>
          <DataTable columns={columns} data={q?.data.items ?? []} emptyLabel="No accounts match your filters." />
          {q?.meta.pagination ? (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                Page {q.meta.pagination.page} of {q.meta.pagination.total_pages ?? 1} · {q.meta.pagination.total ?? 0} accounts
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={q.meta.pagination.page <= 1}
                  onClick={() =>
                    updateParam((params) => {
                      const next = Math.max(1, q.meta.pagination.page - 1);
                      params.set("page", String(next));
                    })
                  }
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={q.meta.pagination.has_more_pages === false}
                  onClick={() =>
                    updateParam((params) => {
                      params.set("page", String(q.meta.pagination.page + 1));
                    })
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create account</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => {
              createMutation.mutate(values);
            })}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="company-name">
                Legal / trading name
              </label>
              <Input id="company-name" {...form.register("name")} />
              {form.formState.errors.name ? (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
