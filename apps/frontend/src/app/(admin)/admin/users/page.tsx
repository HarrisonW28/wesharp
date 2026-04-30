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
import { useAdminApi } from "@/lib/api/use-admin-api";

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
  { label: "Super admin", value: "super_admin" },
  { label: "Admin", value: "admin" },
  { label: "Route manager", value: "route_manager" },
  { label: "Finance", value: "finance" },
  { label: "Customer owner", value: "customer_owner" },
  { label: "Customer staff", value: "customer_staff" },
];

const STATUS_FILTERS: { label: string; value: UserStatusValue | "all" }[] = [
  { label: "All statuses", value: "all" },
  { label: "Invited", value: "invited" },
  { label: "Active", value: "active" },
  { label: "Suspended", value: "suspended" },
];

function roleBadgeVariant(role: UserRoleValue): "default" | "secondary" | "outline" {
  if (role === "super_admin" || role === "admin") {
    return "default";
  }
  if (role === "finance" || role === "route_manager") {
    return "secondary";
  }
  return "outline";
}

function humanRole(role: UserRoleValue): string {
  return ROLE_FILTERS.find((r) => r.value === role)?.label ?? role;
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
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => row.original.status ?? "—",
      },
      {
        id: "company",
        header: "Account",
        cell: ({ row }) => {
          const name = row.original.company_name;
          const id = row.original.company_id;
          if (!id) {
            return "—";
          }
          return (
            <Link className="text-primary hover:underline" href={`/admin/crm/${id}`}>
              {name ?? id.slice(0, 8) + "…"}
            </Link>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Users" }]} />
      <PageHeader
        title="Users"
        description="Directory and access control — sourced from Laravel /api/admin/users. Super admins and admins can view; changes require users.manage."
      />

      <section className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm md:p-6">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="user-q">
              Search
            </label>
            <Input
              id="user-q"
              defaultValue={searchParams.get("q") ?? ""}
              placeholder="Name, email, Clerk ID…"
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
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="user-company">
              Company UUID
            </label>
            <Input
              id="user-company"
              defaultValue={searchParams.get("company_id") ?? ""}
              placeholder="Filter by company id"
              onChange={(event) =>
                updateParam((params) => {
                  const v = event.target.value.trim();
                  if (v) {
                    params.set("company_id", v);
                  } else {
                    params.delete("company_id");
                  }
                  params.set("page", "1");
                })
              }
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
          <DataTable columns={columns} data={q?.data.items ?? []} emptyLabel="No users match your filters." />
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
