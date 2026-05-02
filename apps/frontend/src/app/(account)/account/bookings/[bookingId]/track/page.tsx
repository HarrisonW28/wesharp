"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { CustomerTrackingView } from "@/components/account/CustomerTrackingView";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccountBookingDetailResponseSchema } from "@/lib/api/account-schema";
import { useAccountApi } from "@/lib/api/use-account-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AccountBookingTrackPage() {
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
      const parsed = AccountBookingDetailResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected booking payload.");
      }
      return parsed.data.data;
    },
  });

  const d = query.data;

  return (
    <div className="min-w-0 space-y-8 overflow-x-hidden">
      <Breadcrumbs
        homeHref="/account/dashboard"
        items={[
          { label: "My bookings", href: "/account/bookings" },
          { label: "Booking details", href: `/account/bookings/${bookingId}` },
          { label: "Track progress" },
        ]}
      />
      <PageHeader
        title="Track progress"
        description="Where your collection is right now."
        actions={
          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-11 touch-manipulation rounded-lg sm:h-9 sm:min-h-9"
            asChild
          >
            <Link href={`/account/bookings/${bookingId}`}>Full details</Link>
          </Button>
        }
      />

      {query.status === "pending" ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        </div>
      ) : query.isError ? (
        <Card className="border-destructive/40">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{(query.error as Error).message}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              If this isn’t your booking, you won’t see it here — each company only sees its own collections over the API.
            </p>
            <Button
              type="button"
              className="mt-4 h-11 min-h-11 touch-manipulation rounded-lg sm:h-9 sm:min-h-9"
              variant="outline"
              asChild
            >
              <Link href="/account/bookings">My bookings</Link>
            </Button>
          </CardContent>
        </Card>
      ) : d ? (
        <CustomerTrackingView data={d} variant="account" accountBookingHref={`/account/bookings/${bookingId}`} />
      ) : null}
    </div>
  );
}
