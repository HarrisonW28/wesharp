"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { CustomerTrackingView } from "@/components/account/CustomerTrackingView";
import { Button } from "@/components/ui/button";
import { fetchPublicBookingTracking } from "@/lib/api/public-tracking";
import { Card, CardContent } from "@/components/ui/card";
import { PUBLIC_SITE_CONTENT_CONTAINER_CLASS } from "@/lib/public-site-layout";

export default function PublicTrackBookingPage() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";

  const query = useQuery({
    queryKey: ["public-booking-track", token],
    enabled: Boolean(token),
    queryFn: () => fetchPublicBookingTracking(token),
  });

  return (
    <div className={PUBLIC_SITE_CONTENT_CONTAINER_CLASS}>
      <div className="mx-auto max-w-3xl min-w-0 overflow-x-hidden py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] md:py-14">
      {query.status === "pending" ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          <p className="text-sm">Loading your tracking page…</p>
        </div>
      ) : query.isError ? (
        <Card className="rounded-xl border-destructive/40">
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm text-destructive">{(query.error as Error).message}</p>
            <p className="text-sm text-muted-foreground">
              Links expire after a period for security. If you’re a customer, sign in to your account for the latest status.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="h-11 min-h-11 touch-manipulation rounded-lg" asChild>
                <Link href="/account/dashboard">Customer sign-in</Link>
              </Button>
              <Button type="button" variant="ghost" className="h-11 min-h-11 touch-manipulation rounded-lg" asChild>
                <Link href="/">Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : query.data ? (
        <CustomerTrackingView data={query.data} variant="public" />
      ) : null}
      </div>
    </div>
  );
}
