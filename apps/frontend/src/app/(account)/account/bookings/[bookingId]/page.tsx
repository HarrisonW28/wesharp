"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import { useAccountApi } from "@/lib/api/use-account-api";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/status/StatusBadge";

const BookingEnvelope = z.object({
  success: z.literal(true),
  data: z.record(z.string(), z.unknown()),
});

export default function TenantBookingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const api = useAccountApi();

  const query = useQuery({
    queryKey: ["account-booking", bookingId],
    enabled: Boolean(bookingId),
    queryFn: async () => {
      const res = await api.json<unknown>(`/api/account/bookings/${bookingId}`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = BookingEnvelope.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected booking payload.");
      }
      return parsed.data.data;
    },
  });

  const d = query.data ?? null;

  return (
    <div className="space-y-8">
      <Breadcrumbs
        homeHref="/account/dashboard"
        items={[
          { label: "My bookings", href: "/account/bookings" },
          { label: "Booking details" },
        ]}
      />
      <PageHeader
        title="Booking details"
        description="Here’s what we have on file for this collection. We’ll update status as your booking is confirmed."
      />

      {query.status === "pending" ? (
        <div className="flex min-h-[20vh] items-center justify-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        </div>
      ) : query.isError ? (
        <p className="text-sm text-destructive">{(query.error as Error).message}</p>
      ) : d ? (
        (() => {
          const fmtT = (t: unknown) =>
            typeof t === "string" ? (t.length >= 5 ? t.slice(0, 5) : t) : "—";
          const hasConfirmedDay = Boolean(d.confirmed_collection_date);
          const hasConfirmedWin = Boolean(d.confirmed_time_window_start || d.confirmed_time_window_end);
          const confirmedLine = hasConfirmedDay
            ? `${String(d.confirmed_collection_date)}${
                hasConfirmedWin
                  ? ` · ${fmtT(d.confirmed_time_window_start)} — ${fmtT(d.confirmed_time_window_end)}`
                  : ""
              }`
            : "Not yet — we’ll confirm your arrival window.";

          return (
        <div className="grid gap-6 rounded-xl border bg-card p-6 shadow-sm md:grid-cols-2">
          <div className="space-y-2 text-sm">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Status</div>
            <StatusBadge kind="booking" status={typeof d.status === "string" ? d.status : ""} />
            <div className="pt-2 text-xs font-semibold uppercase text-muted-foreground">Requested day</div>
            <div>{String(d.requested_date ?? "—")}</div>
            <div className="pt-2 text-xs font-semibold uppercase text-muted-foreground">Requested window</div>
            <div>
              {[d.time_window_start, d.time_window_end].filter(Boolean).join(" — ") || "—"}
            </div>
            <div className="pt-2 text-xs font-semibold uppercase text-muted-foreground">Confirmed arrival window</div>
            <div className="text-muted-foreground">{confirmedLine}</div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Service</div>
            <div>{String(d.service_type ?? "—")}</div>
            <div className="pt-2 text-xs font-semibold uppercase text-muted-foreground">Notes from you</div>
            <div className="whitespace-pre-wrap text-muted-foreground">{String(d.customer_notes ?? "—")}</div>
          </div>
          <div className="md:col-span-2 border-t pt-4 text-sm">
            <Link className="font-medium text-primary underline underline-offset-2" href="/account/bookings">
              Back to my bookings
            </Link>
          </div>
        </div>
          );
        })()
      ) : null}
    </div>
  );
}
