"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { useQuery } from "@tanstack/react-query";

import {
  PaginatedUsersResponseSchema,
  type UserDirectoryRow,
  type UserRoleValue,
  type UserStatusValue,
} from "@/lib/api/admin-users-schema";
import { USER_ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/admin-user-role-copy";
import { useAdminApi } from "@/lib/api/use-admin-api";

import { CompanyLookup } from "@/components/admin/lookups/AsyncEntityLookup";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/tables/DataTable";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLE_FILTERS: { label: string; value: UserRoleValue | "all" }[] = [
  { label: "All roles", value: "all" },
  { label: USER_ROLE_LABELS.super_admin, value: "super_admin" },
  { label: USER_ROLE_LABELS.admin, value: "admin" },
  { label: USER_ROLE_LABELS.developer, value: "developer" },
  { label: USER_ROLE_LABELS.route_manager, value: "route_manager" },
  { label: USER_ROLE_LABELS.finance, value: "finance" },
  { label: USER_ROLE_LABELS.customer_owner, value: "customer_owner" },
  { label: USER_ROLE_LABELS.customer_staff, value: "customer_staff" },
];

const STATUS_FILTERS: { label: string; value: UserStatusValue | "all" }[] = [
  { label: "All statuses", value: "all" },
  { label: USER_STATUS_LABELS.invited, value: "invited" },
  { label: USER_STATUS_LABELS.active, value: "active" },
  { label: USER_STATUS_LABELS.suspended, value: "suspended" },
];

const BUCKET_FILTERS: { label: string; value: "all" | "internal" | "customer" }[] = [
  { label: "All users", value: "all" },
  { label: "Internal staff", value: "internal" },
  { label: "Customer / tenant", value: "customer" },
];

function roleBadgeVariant(role: UserRoleValue): "default" | "secondary" | "outline" {
  if (role === "super_admin" || role === "admin") {
    return "default";
  }
  if (role === "finance" || role === "route_manager" || role === "developer") {
    return "secondary";
  }
  return "outline";
}

function humanRole(role: UserRoleValue): string {
  return USER_ROLE_LABELS[role] ?? role;
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminUsersPage() {
  const admin = useAdminApi();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
    ensure("per_page", "25");

    if (changed) {
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    }
  }, [pathname, router, searchParams]);

  const listQueryKey = searchParams.toString();

  const query = useQuery({
    queryKey: ["admin-users", listQueryKey],
    queryFn: async () => {
      const qs = listQueryKey ? `?${listQueryKey}` : "";
      const res = await admin.json<unknown>(`/api/admin/users${qs}`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = PaginatedUsersResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected users list response.");
      }
      return parsed.data;
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

  const q = query.data;

  const companyIdFilter = searchParams.get("company_id") ?? "";
  const listCompanyInitial = useMemo(() => {
    const first = q?.data.items.find((row) => row.company_id === companyIdFilter);
    if (!first?.company_id || first.company_name == null) {
      return null;
    }
    return { id: first.company_id, label: first.company_name, description: null as string | null };
  }, [q?.data.items, companyIdFilter]);

  const columns: ColumnDef<UserDirectoryRow>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "User",
        cell: ({ row }) => (
          <Link className="font-medium text-primary hover:underline" href={`/admin/users/${row.original.id}`}>
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => (
          <Badge variant={roleBadgeVariant(row.original.role)} className="font-normal">
            {humanRole(row.original.role)}
          </Badge>
        ),
      },
      {
        id: "bucket",
        header: "Type",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.role_bucket === "internal" ? "Internal" : "Customer"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const s = row.original.status;
          return s ? (USER_STATUS_LABELS[s] ?? s) : "—";
        },
      },
      {
        id: "company",
        header: "Company",
        cell: ({ row }) => {
          const name = row.original.company_name;
          const id = row.original.company_id;
          if (!id) {
            return "—";
          }
          return (
            <Link className="text-primary hover:underline" href={`/admin/crm/${id}`}>
              {name ?? "View account"}
            </Link>
          );
        },
      },
      {
        id: "created",
        header: "Created",
        cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{formatShortDate(row.original.created_at)}</span>,
      },
      {
        id: "updated",
        header: "Updated",
        cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{formatShortDate(row.original.updated_at)}</span>,
      },
    ],
    [],
  );

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Users" }]} />
      <PageHeader
        title="Users"
        description="Directory and access control — Laravel roles are the source of truth. Clerk handles sign-in only."
      />

      <section className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm md:p-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <div className="space-y-2 sm:col-span-2 xl:col-span-1 2xl:col-span-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="user-q">
              Search
            </label>
            <Input
              id="user-q"
              defaultValue={searchParams.get("q") ?? ""}
              placeholder="Name or email"
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
            <label className="text-xs font-medium text-muted-foreground" htmlFor="user-bucket">
              User type
            </label>
            <Select
              value={searchParams.get("role_bucket") ?? "all"}
              onValueChange={(value) =>
                updateParam((params) => {
                  if (value === "all") {
                    params.delete("role_bucket");
                  } else {
                    params.set("role_bucket", value);
                  }
                  params.set("page", "1");
                })
              }
            >
              <SelectTrigger id="user-bucket">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {BUCKET_FILTERS.map((row) => (
                  <SelectItem key={row.value} value={row.value}>
                    {row.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="user-role">
              Role
            </label>
            <Select
              value={searchParams.get("role") ?? "all"}
              onValueChange={(value) =>
                updateParam((params) => {
                  if (value === "all") {
                    params.delete("role");
                  } else {
                    params.set("role", value);
                  }
                  params.set("page", "1");
                })
              }
            >
              <SelectTrigger id="user-role">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_FILTERS.map((row) => (
                  <SelectItem key={row.value} value={row.value}>
                    {row.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="user-status">
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
              <SelectTrigger id="user-status">
                <SelectValue placeholder="Status" />
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
          <div className="space-y-2 sm:col-span-2 xl:col-span-2">
            <CompanyLookup
              label="Company filter"
              id="user-company-filter"
              value={companyIdFilter === "" ? null : companyIdFilter}
              onChange={(id) =>
                updateParam((params) => {
                  if (id) {
                    params.set("company_id", id);
                  } else {
                    params.delete("company_id");
                  }
                  params.set("page", "1");
                })
              }
              nullable
              placeholder="Search company by name…"
              initialOption={listCompanyInitial}
            />
          </div>
        </div>
      </section>

      {query.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading users…
        </div>
      ) : query.isError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {query.error instanceof Error ? query.error.message : "Unable to load users."}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
            <DataTable columns={columns} data={q?.data.items ?? []} emptyLabel="No users match your filters." />
          </div>
          {q?.meta.pagination ? (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                Page {q.meta.pagination.page} of {q.meta.pagination.total_pages ?? 1} · {q.meta.pagination.total ?? 0}{" "}
                users
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
    </div>
  );
}
