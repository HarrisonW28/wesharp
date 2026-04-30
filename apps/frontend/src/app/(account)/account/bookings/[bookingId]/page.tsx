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
          { label: "Bookings", href: "/account/bookings" },
          { label: "Detail" },
        ]}
      />
      <PageHeader title="Booking status" description="Live route assignment happens on the operations side — this view is read-only." />

      {query.status === "pending" ? (
        <div className="flex min-h-[20vh] items-center justify-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        </div>
      ) : query.isError ? (
        <p className="text-sm text-destructive">{(query.error as Error).message}</p>
      ) : d ? (
        <div className="grid gap-6 rounded-2xl border bg-card p-6 shadow-sm md:grid-cols-2">
          <div className="space-y-2 text-sm">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Status</div>
            <StatusBadge kind="booking" status={d.status ?? ""} />
            <div className="pt-2 text-xs font-semibold uppercase text-muted-foreground">Requested day</div>
            <div>{String(d.requested_date ?? "—")}</div>
            <div className="pt-2 text-xs font-semibold uppercase text-muted-foreground">Window</div>
            <div>
              {[d.time_window_start, d.time_window_end].filter(Boolean).join(" — ") || "—"}
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Service</div>
            <div>{String(d.service_type ?? "—")}</div>
            <div className="pt-2 text-xs font-semibold uppercase text-muted-foreground">Notes from you</div>
            <div className="whitespace-pre-wrap text-muted-foreground">{String(d.customer_notes ?? "—")}</div>
          </div>
          <div className="md:col-span-2 border-t pt-4 text-sm">
            <Link className="text-primary underline" href="/account/bookings">
              Back to bookings
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
