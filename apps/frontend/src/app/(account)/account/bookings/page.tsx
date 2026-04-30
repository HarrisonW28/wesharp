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
import { EmptyState } from "@/components/feedback/EmptyState";

export default function AccountBookingsPage() {
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
      <Breadcrumbs homeHref="/account/dashboard" items={[{ label: "My bookings" }]} />
      <PageHeader
        title="My bookings"
        description="Collections you've booked with us — dates, time windows, and status update when we confirm your slot."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="rounded-lg" asChild>
              <Link href="/account/bookings/new">Book a collection</Link>
            </Button>
            <Button size="sm" variant="outline" className="rounded-lg" asChild>
              <Link href="/pricing">View pricing</Link>
            </Button>
          </div>
        }
      />

      {listQuery.status === "pending" ? (
        <div className="flex min-h-[20vh] items-center justify-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        </div>
      ) : listQuery.isError ? (
        <EmptyState icon={CalendarClock} title="Could not load bookings" description={(listQuery.error as Error)?.message ?? ""} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No bookings yet"
          description="Request your first collection — we’ll confirm the date and time window with you."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Collection date</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Requested window</th>
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
                  <td className="px-4 py-3 text-muted-foreground">
                    {(() => {
                      const row = b as {
                        time_window_start?: string | null;
                        time_window_end?: string | null;
                        requested_time_window_start?: string | null;
                        requested_time_window_end?: string | null;
                      };
                      const a = row.requested_time_window_start ?? row.time_window_start;
                      const e = row.requested_time_window_end ?? row.time_window_end;
                      if (!a && !e) return "—";
                      const fmt = (s: string) => (s.length >= 5 ? s.slice(0, 5) : s);
                      return `${a ? fmt(a) : "?"}–${e ? fmt(e) : "?"}`;
                    })()}
                  </td>
                  <td className="px-4 py-3">{b.service_type?.replace("_", " ") ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link className="font-medium text-primary underline underline-offset-2" href={`/account/bookings/${b.id}`}>
                      View booking
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
