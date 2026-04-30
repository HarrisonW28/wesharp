"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { PaginatedTenantKnivesSchema } from "@/lib/api/account-schema";
import { useAccountApi } from "@/lib/api/use-account-api";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";

export default function AccountKnivesPage() {
  const api = useAccountApi();

  const listQuery = useQuery({
    queryKey: ["account-knives"],
    queryFn: async () => {
      const res = await api.json<unknown>(`/api/account/knives?per_page=100`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = PaginatedTenantKnivesSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected knives payload.");
      }
      return parsed.data.data.items;
    },
  });

  const rows = listQuery.data ?? [];

  return (
    <div className="space-y-8">
      <Breadcrumbs homeHref="/account/dashboard" items={[{ label: "Knives" }]} />
      <PageHeader
        title="Knife history"
        description="Tag-level tracking through the workshop — editing happens on the operations console."
      />

      {listQuery.status === "pending" ? (
        <div className="flex min-h-[20vh] items-center justify-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        </div>
      ) : listQuery.isError ? (
        <p className="text-sm text-destructive">{(listQuery.error as Error).message}</p>
      ) : (
        <div className="overflow-hidden rounded-md border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Tag</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((k) => (
                <tr key={k.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{k.tag_id ?? k.id}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{k.status ?? "—"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{k.updated_at ? new Date(k.updated_at).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-center text-muted-foreground">
              No knives yet —{" "}
              <Link className="text-primary underline" href="/account/bookings/new">
                submit a pickup
              </Link>
              .
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
