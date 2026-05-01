"use client";

import Link from "next/link";
import { CalendarClock, ChevronRight, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { PaginatedBookingsResponseSchema } from "@/lib/api/account-schema";
import { useAccountApi } from "@/lib/api/use-account-api";

import { CustomerBookingStatusBadge } from "@/components/bookings/CustomerBookingStatusBadge";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatBookingTimeWindow } from "@/lib/bookings/customer-booking-ui";

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
        description="Collections you’ve booked with us — requested times, confirmed visits, and live status."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="rounded-lg" asChild>
              <Link href="/account/bookings/new">Book a collection</Link>
            </Button>
            <Button size="sm" variant="outline" className="rounded-lg" asChild>
              <Link href="/pricing">Pricing</Link>
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
        <>
          <div className="grid gap-3 md:hidden">
            {rows.map((b) => {
              const row = b as {
                requested_time_window_start?: string | null;
                requested_time_window_end?: string | null;
                display_collection_date?: string | null;
                display_time_window_start?: string | null;
                display_time_window_end?: string | null;
                customer_cancellable?: boolean;
              };
              const requestedWin = formatBookingTimeWindow(
                row.requested_time_window_start ?? b.time_window_start,
                row.requested_time_window_end ?? b.time_window_end,
              );
              const displayWin = formatBookingTimeWindow(row.display_time_window_start, row.display_time_window_end);
              const displayDay = row.display_collection_date ?? b.requested_date ?? "Date TBC";
              return (
                <Card key={b.id} className="overflow-hidden border shadow-sm">
                  <CardContent className="p-0">
                    <Link
                      href={`/account/bookings/${b.id}`}
                      className="flex items-start justify-between gap-3 p-4 transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0 space-y-2">
                        <div className="font-medium leading-tight">{displayDay}</div>
                        <CustomerBookingStatusBadge status={b.status} />
                        {displayWin ? (
                          <p className="text-xs text-muted-foreground">
                            {requestedWin && displayWin !== requestedWin
                              ? `Confirmed · ${displayWin}`
                              : `Window · ${displayWin}`}
                          </p>
                        ) : requestedWin ? (
                          <p className="text-xs text-muted-foreground">Requested window · {requestedWin}</p>
                        ) : null}
                        {b.service_type ? (
                          <p className="text-xs capitalize text-muted-foreground">{b.service_type.replace(/_/g, " ")}</p>
                        ) : null}
                      </div>
                      <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Collection date</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Requested window</th>
                  <th className="px-4 py-2 text-left font-medium">Confirmed window</th>
                  <th className="px-4 py-2 text-left font-medium">Service</th>
                  <th className="px-4 py-2 text-right font-medium">&nbsp;</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => {
                  const ext = b as {
                    requested_time_window_start?: string | null;
                    requested_time_window_end?: string | null;
                    confirmed_collection_date?: string | null;
                    confirmed_time_window_start?: string | null;
                    confirmed_time_window_end?: string | null;
                  };
                  const reqWin = formatBookingTimeWindow(
                    ext.requested_time_window_start ?? b.time_window_start,
                    ext.requested_time_window_end ?? b.time_window_end,
                  );
                  const cw = formatBookingTimeWindow(ext.confirmed_time_window_start, ext.confirmed_time_window_end);
                  const confWin =
                    ext.confirmed_collection_date || cw
                      ? [ext.confirmed_collection_date, cw].filter(Boolean).join(" · ")
                      : null;
                  return (
                    <tr key={b.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3 align-top">{b.requested_date ?? "—"}</td>
                      <td className="px-4 py-3 align-top">
                        <CustomerBookingStatusBadge status={b.status} />
                      </td>
                      <td className="px-4 py-3 align-top text-muted-foreground">{reqWin ?? "—"}</td>
                      <td className="px-4 py-3 align-top text-muted-foreground">{confWin ?? "—"}</td>
                      <td className="px-4 py-3 align-top capitalize">{b.service_type?.replace(/_/g, " ") ?? "—"}</td>
                      <td className="px-4 py-3 text-right align-top">
                        <Link className="font-medium text-primary underline underline-offset-2" href={`/account/bookings/${b.id}`}>
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
