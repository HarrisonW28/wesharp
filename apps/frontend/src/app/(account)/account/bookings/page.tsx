"use client";

import Link from "next/link";
import { CalendarClock, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { PaginatedBookingsResponseSchema } from "@/lib/api/account-schema";
import { useAccountApi } from "@/lib/api/use-account-api";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Button } from "@/components/ui/button";
  const api = useAccountApi();

  const listQuery = useQuery({
    queryKey: ["account-bookings"],
    queryFn: async () => {
      const res = await api.json<unknown>(`/api/account/bookings?per_page=50`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = PaginatedBookingsResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected bookings payload.");
      }
      return parsed.data.data.items;
    },
  });

  const rows = listQuery.data ?? [];

  return (
    <div className="space-y-8">
      <Breadcrumbs homeHref="/account/dashboard" items={[{ label: "Bookings" }]} />
      <PageHeader
        title="Collections & bookings"
        description="Track every pickup slot you requested with WeSharp."
        actions={
          <Button size="sm" asChild>
            <Link href="/account/bookings/new">New booking</Link>
          </Button>
        }
      />

      {listQuery.status === "pending" ? (
        <div className="flex min-h-[20vh] items-center justify-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        </div>
      ) : listQuery.isError ? (
        <EmptyState icon={CalendarClock} title="Could not load bookings" description={(listQuery.error as Error)?.message ?? ""} />
      ) : rows.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No bookings yet" description="Kick off your first courier window from the wizard." />
      ) : (
        <div className="overflow-hidden rounded-md border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Scheduled</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Service</th>
                <th className="px-4 py-2 text-right font-medium">&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3">{b.requested_date ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge kind="booking" status={b.status} />
                  </td>
                  <td className="px-4 py-3">{b.service_type?.replace("_", " ") ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link className="text-primary underline" href={`/account/bookings/${b.id}`}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
